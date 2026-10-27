import ExcelJS from 'exceljs';
import crypto from 'crypto';
import fs from 'fs';
import { db } from './db.ts';
import { CalculationEngine, ChargeClassification, ProcessingStatus } from './calculation-engine.ts';

export interface IngestionPreview {
  filename: string;
  fileHash: string;
  isExistingHash: boolean;
  sheetsFound: string[];
  missingRequiredSheets: string[];
  pendingPORowsCount: number;
  reportRowsCount: number;
  billedRowsCount: number;
  queriedRowsCount: number;
  summaryBlocksCount: number;
  distinctCJsCount: number;
  totalChargesValue: number;
  potentialDuplicates: any[];
  warnings: string[];
}

export class IngestionService {
  /**
   * Preview a workbook without committing changes
   */
  static async previewWorkbook(filePath: string, originalFilename: string): Promise<IngestionPreview> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existingBatch = db.prepare('SELECT id, imported_at FROM import_batches WHERE file_hash = ?').get(fileHash) as any;

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const sheetNames = wb.worksheets.map(ws => ws.name);
    const required = ['Pending PO', 'Report', 'Billed', 'QUERIED', ' REPORTS SUMMARY'];
    const missing = required.filter(r => !sheetNames.includes(r));

    const warnings: string[] = [];
    if (existingBatch) {
      warnings.push(`Identical workbook previously imported on ${existingBatch.imported_at} (Batch ID: ${existingBatch.id}). Re-importing will reconcile without duplicating identical rows.`);
    }

    const pendingWs = wb.getWorksheet('Pending PO');
    const reportWs = wb.getWorksheet('Report');
    const billedWs = wb.getWorksheet('Billed');
    const queriedWs = wb.getWorksheet('QUERIED');
    const summaryWs = wb.getWorksheet(' REPORTS SUMMARY');

    let pendingCount = 0;
    let totalCharges = 0;
    const cjs = new Set<string>();

    if (pendingWs) {
      pendingWs.eachRow((row, r) => {
        if (r <= 2) return;
        const cj = row.getCell(2).value?.toString()?.trim();
        if (cj) {
          pendingCount++;
          cjs.add(CalculationEngine.normalizeCJ(cj));
          const totalCell = row.getCell(7);
          let amt = 0;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'result' in (totalCell.value as any)) {
            amt = Number((totalCell.value as any).result) || 0;
          } else if (typeof totalCell.value === 'number') {
            amt = totalCell.value;
          }
          totalCharges += amt;
        }
      });
    }

    let summaryBlocks = 0;
    if (summaryWs) {
      for (let r = 1; r < summaryWs.rowCount; r += 26) {
        for (const valCol of [2, 6, 10]) {
          if (summaryWs.getRow(r).getCell(valCol).value) {
            summaryBlocks++;
          }
        }
      }
    }

    return {
      filename: originalFilename,
      fileHash,
      isExistingHash: !!existingBatch,
      sheetsFound: sheetNames,
      missingRequiredSheets: missing,
      pendingPORowsCount: pendingCount,
      reportRowsCount: reportWs ? Math.max(0, reportWs.actualRowCount - 1) : 0,
      billedRowsCount: billedWs ? Math.max(0, billedWs.actualRowCount - 2) : 0,
      queriedRowsCount: queriedWs ? Math.max(0, queriedWs.actualRowCount - 2) : 0,
      summaryBlocksCount: summaryBlocks,
      distinctCJsCount: cjs.size,
      totalChargesValue: Math.round(totalCharges * 100) / 100,
      potentialDuplicates: [],
      warnings
    };
  }

  /**
   * Commit workbook import transactionally
   */
  static async importWorkbook(filePath: string, originalFilename: string): Promise<{ batchId: string; summary: any }> {
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const batchId = `BATCH-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const insertBatch = db.prepare(`
      INSERT INTO import_batches (
        id, filename, file_hash, imported_at, total_rows, pending_po_rows,
        report_rows, billed_rows, queried_rows, summary_blocks, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSourceRow = db.prepare(`
      INSERT INTO source_rows (id, batch_id, sheet_name, row_index, raw_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const upsertShipment = db.prepare(`
      INSERT INTO shipments (
        id, raw_cj, bl, shipping_line, size, consignee, customer, description_of_goods, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        raw_cj = excluded.raw_cj,
        bl = COALESCE(excluded.bl, shipments.bl),
        shipping_line = COALESCE(excluded.shipping_line, shipments.shipping_line),
        size = COALESCE(excluded.size, shipments.size),
        consignee = COALESCE(excluded.consignee, shipments.consignee),
        customer = COALESCE(excluded.customer, shipments.customer),
        description_of_goods = COALESCE(excluded.description_of_goods, shipments.description_of_goods),
        status = COALESCE(excluded.status, shipments.status),
        updated_at = excluded.updated_at
    `);

    const upsertContainer = db.prepare(`
      INSERT INTO containers (id, shipment_id, container_no, size, weight, status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        shipment_id = excluded.shipment_id,
        size = excluded.size,
        weight = excluded.weight,
        status = excluded.status
    `);

    const upsertCharge = db.prepare(`
      INSERT INTO charge_entries (
        id, batch_id, source_row_id, sn, cj, normalized_cj, bl, container_info,
        details, classification, po_no, amount, raw_formula, comment,
        processing_status, is_verified, query_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_row_id = excluded.source_row_id,
        bl = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.bl ELSE COALESCE(excluded.bl, charge_entries.bl) END,
        container_info = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.container_info ELSE COALESCE(excluded.container_info, charge_entries.container_info) END,
        po_no = CASE WHEN charge_entries.is_verified = 1 AND charge_entries.po_no IS NOT NULL AND charge_entries.po_no != 'Pending' THEN charge_entries.po_no WHEN excluded.po_no != 'Pending' AND excluded.po_no IS NOT NULL THEN excluded.po_no ELSE charge_entries.po_no END,
        amount = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.amount ELSE excluded.amount END,
        raw_formula = excluded.raw_formula,
        comment = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.comment ELSE COALESCE(excluded.comment, charge_entries.comment) END,
        processing_status = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.processing_status WHEN excluded.processing_status != 'PENDING' THEN excluded.processing_status ELSE charge_entries.processing_status END,
        query_reason = CASE WHEN charge_entries.is_verified = 1 THEN charge_entries.query_reason ELSE COALESCE(excluded.query_reason, charge_entries.query_reason) END,
        updated_at = excluded.updated_at
    `);

    const upsertShipmentDetails = db.prepare(`
      INSERT INTO shipment_details_24 (
        shipment_id, file_no, bl, size, shipping_line, docs_received_date,
        discharge_date, carry_in_date, do_date, assessment_notice,
        release_order_print_date, port_charges, allocation_request_date,
        allocation_date, delays_in_allocation, truck_number, loaded, clearance,
        client_delay, storage_amount, cwr_amount, comments, transport_total,
        clearing_total, client_total, provenance_map, is_draft, is_verified,
        verified_by, verified_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(shipment_id) DO UPDATE SET
        bl = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.bl ELSE COALESCE(excluded.bl, shipment_details_24.bl) END,
        size = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.size ELSE COALESCE(excluded.size, shipment_details_24.size) END,
        shipping_line = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.shipping_line ELSE COALESCE(excluded.shipping_line, shipment_details_24.shipping_line) END,
        docs_received_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.docs_received_date ELSE COALESCE(excluded.docs_received_date, shipment_details_24.docs_received_date) END,
        discharge_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.discharge_date ELSE COALESCE(excluded.discharge_date, shipment_details_24.discharge_date) END,
        carry_in_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.carry_in_date ELSE COALESCE(excluded.carry_in_date, shipment_details_24.carry_in_date) END,
        do_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.do_date ELSE COALESCE(excluded.do_date, shipment_details_24.do_date) END,
        assessment_notice = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.assessment_notice ELSE COALESCE(excluded.assessment_notice, shipment_details_24.assessment_notice) END,
        release_order_print_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.release_order_print_date ELSE COALESCE(excluded.release_order_print_date, shipment_details_24.release_order_print_date) END,
        port_charges = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.port_charges ELSE COALESCE(excluded.port_charges, shipment_details_24.port_charges) END,
        allocation_request_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.allocation_request_date ELSE COALESCE(excluded.allocation_request_date, shipment_details_24.allocation_request_date) END,
        allocation_date = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.allocation_date ELSE COALESCE(excluded.allocation_date, shipment_details_24.allocation_date) END,
        delays_in_allocation = excluded.delays_in_allocation,
        truck_number = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.truck_number ELSE COALESCE(excluded.truck_number, shipment_details_24.truck_number) END,
        loaded = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.loaded ELSE COALESCE(excluded.loaded, shipment_details_24.loaded) END,
        clearance = excluded.clearance,
        client_delay = excluded.client_delay,
        storage_amount = excluded.storage_amount,
        cwr_amount = excluded.cwr_amount,
        comments = CASE WHEN shipment_details_24.is_verified = 1 THEN shipment_details_24.comments ELSE COALESCE(excluded.comments, shipment_details_24.comments) END,
        transport_total = excluded.transport_total,
        clearing_total = excluded.clearing_total,
        client_total = excluded.client_total,
        provenance_map = excluded.provenance_map,
        updated_at = excluded.updated_at
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_events (id, entity_type, entity_id, field_name, old_value, new_value, action, reason, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let pendingCount = 0;
    let reportCount = 0;
    let billedCount = 0;
    let queriedCount = 0;
    let summaryCount = 0;

    // Use transaction for atomic consistency
    const transaction = db.transaction(() => {
      // Insert batch record first to satisfy foreign key constraints
      insertBatch.run(
        batchId, originalFilename, fileHash, now,
        0, 0, 0, 0, 0, 0,
        'IN_PROGRESS', `Ingesting ${originalFilename}`
      );

      // 1. Process Billed sheet evidence
      const billedMap = new Map<string, { poNo: string; amount: number; comment?: string }>();
      const billedWs = wb.getWorksheet('Billed');
      if (billedWs) {
        billedWs.eachRow((row, r) => {
          if (r <= 2) return;
          const rawCj = row.getCell(2).value?.toString()?.trim();
          if (!rawCj) return;
          billedCount++;
          const cj = CalculationEngine.normalizeCJ(rawCj);
          const details = row.getCell(5).value?.toString()?.trim() || '';
          const po = row.getCell(6).value?.toString()?.trim() || '';
          const totalCell = row.getCell(7);
          let amt = 0;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'result' in (totalCell.value as any)) {
            amt = Number((totalCell.value as any).result) || 0;
          } else if (typeof totalCell.value === 'number') {
            amt = totalCell.value;
          }
          const key = `${cj}|${details.toLowerCase()}`;
          const classification = CalculationEngine.classifyCharge(details);
          let formulaStr: string | null = null;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'formula' in (totalCell.value as any)) {
            formulaStr = String((totalCell.value as any).formula);
          }

          const srcId = `SRC-${batchId}-Billed-${r}`;
          insertSourceRow.run(srcId, batchId, 'Billed', r, JSON.stringify({
            sn: row.getCell(1).value,
            cj: rawCj,
            bl: row.getCell(3).value,
            containers: row.getCell(4).value,
            details,
            poNo: po,
            total: amt
          }), now);

          const chargeId = `CHG-BILLED-${cj}-${classification}-${r}`;
          upsertShipment.run(cj, rawCj, row.getCell(3).value?.toString()?.trim() || null, null, null, null, null, null, 'BILLED', now, now);
          upsertCharge.run(
            chargeId, batchId, srcId, r - 2, rawCj, cj, row.getCell(3).value?.toString()?.trim() || '',
            row.getCell(4).value?.toString()?.trim() || '', details, classification, po || 'Billed',
            amt, formulaStr, 'Billed PO allocated', 'BILLED', 1, null, now, now
          );
        });
      }

      // 2. Process QUERIED sheet evidence
      const queriedMap = new Map<string, { amount: number; comment: string }>();
      const queriedWs = wb.getWorksheet('QUERIED');
      if (queriedWs) {
        queriedWs.eachRow((row, r) => {
          if (r <= 2) return;
          const rawCj = row.getCell(2).value?.toString()?.trim();
          if (!rawCj) return;
          queriedCount++;
          const cj = CalculationEngine.normalizeCJ(rawCj);
          const details = row.getCell(5).value?.toString()?.trim() || '';
          const totalCell = row.getCell(7);
          let amt = 0;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'result' in (totalCell.value as any)) {
            amt = Number((totalCell.value as any).result) || 0;
          } else if (typeof totalCell.value === 'number') {
            amt = totalCell.value;
          }
          const comment = row.getCell(8).value?.toString()?.trim() || '';
          const key = `${cj}|${details.toLowerCase()}`;
          queriedMap.set(key, { amount: amt, comment });

          const srcId = `SRC-${batchId}-QUERIED-${r}`;
          insertSourceRow.run(srcId, batchId, 'QUERIED', r, JSON.stringify({
            sn: row.getCell(1).value,
            cj: rawCj,
            bl: row.getCell(3).value,
            containers: row.getCell(4).value,
            details,
            poNo: row.getCell(6).value,
            total: amt,
            comment
          }), now);

          const classification = CalculationEngine.classifyCharge(details);
          let formulaStr: string | null = null;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'formula' in (totalCell.value as any)) {
            formulaStr = String((totalCell.value as any).formula);
          }

          const chargeId = `CHG-QUERIED-${cj}-${classification}-${r}`;
          upsertShipment.run(cj, rawCj, row.getCell(3).value?.toString()?.trim() || null, null, null, null, null, null, 'QUERIED', now, now);
          upsertCharge.run(
            chargeId, batchId, srcId, r - 2, rawCj, cj, row.getCell(3).value?.toString()?.trim() || '',
            row.getCell(4).value?.toString()?.trim() || '', details, classification, 'Pending',
            amt, formulaStr, comment, 'QUERIED', 0, comment, now, now
          );
        });
      }

      // 3. Process Report sheet (shipments and containers)
      const reportWs = wb.getWorksheet('Report');
      if (reportWs) {
        reportWs.eachRow((row, r) => {
          if (r <= 1) return;
          const rawCj = row.getCell(1).value?.toString()?.trim();
          if (!rawCj) return;
          reportCount++;
          const cj = CalculationEngine.normalizeCJ(rawCj);
          const bl = row.getCell(2).value?.toString()?.trim() || '';
          const containerNo = row.getCell(3).value?.toString()?.trim() || '';
          const status = row.getCell(4).value?.toString()?.trim() || '';
          const weight = Number(row.getCell(5).value) || 0;
          const size = row.getCell(6).value?.toString()?.trim() || '';
          const shippingLine = row.getCell(12).value?.toString()?.trim() || '';
          const description = row.getCell(13).value?.toString()?.trim() || '';
          const customer = row.getCell(9).value?.toString()?.trim() || '';
          const consignee = row.getCell(11).value?.toString()?.trim() || '';

          // Dates
          const docsRec = CalculationEngine.parseDateOnly(row.getCell(15).value);
          const discharge = CalculationEngine.parseDateOnly(row.getCell(18).value);
          const carryIn = CalculationEngine.parseDateOnly(row.getCell(19).value);
          const doDate = CalculationEngine.parseDateOnly(row.getCell(20).value);
          const assess = CalculationEngine.parseDateOnly(row.getCell(21).value);
          const release = CalculationEngine.parseDateOnly(row.getCell(22).value);
          const portCharges = CalculationEngine.parseDateOnly(row.getCell(23).value);
          const allocReq = CalculationEngine.parseDateOnly(row.getCell(24).value);
          const allocDate = CalculationEngine.parseDateOnly(row.getCell(25).value);
          const truckNo = row.getCell(27).value?.toString()?.trim() || '';
          const loaded = CalculationEngine.parseDateOnly(row.getCell(29).value) || CalculationEngine.parseDateOnly(row.getCell(28).value) || status;
          const comment = row.getCell(31).value?.toString()?.trim() || '';

          // Upsert shipment
          upsertShipment.run(cj, rawCj, bl, shippingLine, size, consignee, customer, description, status, now, now);

          // Container
          if (containerNo) {
            const contId = `${cj}-${containerNo}`;
            upsertContainer.run(contId, cj, containerNo, size, weight, status);
          }

          // Initial 24-field detail if not present
          const existingDetails = db.prepare('SELECT shipment_id FROM shipment_details_24 WHERE shipment_id = ?').get(cj);
          if (!existingDetails) {
            const metrics = CalculationEngine.computeShipmentMetrics({
              allocationRequestDate: allocReq,
              allocationDate: allocDate,
              docsReceivedDate: docsRec,
              dischargeDate: discharge,
              doDate: doDate,
              storageCharges: 0,
              cwrCharges: 0,
              reeferCharges: 0
            });

            const prov: Record<string, string> = {
              file_no: 'Report — matched by CJ',
              bl: 'Report — matched by BL',
              size: 'Report',
              shipping_line: 'Report',
              docs_received_date: 'Report',
              discharge_date: 'Report',
              carry_in_date: 'Report',
              do_date: 'Report',
              assessment_notice: 'Report',
              release_order_print_date: 'Report',
              port_charges: 'Report',
              allocation_request_date: 'Report',
              allocation_date: 'Report',
              truck_number: 'Report',
              loaded: 'Report',
              comments: 'Report'
            };

            upsertShipmentDetails.run(
              cj, rawCj, bl, size, shippingLine, docsRec, discharge, carryIn, doDate, assess,
              release, portCharges, allocReq, allocDate, metrics.delaysInAllocation, truckNo,
              loaded, metrics.clearance, metrics.clientDelay, 0, 0, comment, 0, 0, 0,
              JSON.stringify(prov), 0, 0, null, null, now
            );
          }

          const srcId = `SRC-${batchId}-Report-${r}`;
          insertSourceRow.run(srcId, batchId, 'Report', r, JSON.stringify({
            cj: rawCj,
            bl,
            containerNo,
            shippingLine,
            discharge,
            docsRec,
            status
          }), now);
        });
      }

      // 4. Process Pending PO sheet (Master Operational Charges)
      const pendingWs = wb.getWorksheet('Pending PO');
      if (pendingWs) {
        pendingWs.eachRow((row, r) => {
          if (r <= 2) return;
          const rawCj = row.getCell(2).value?.toString()?.trim();
          if (!rawCj) return;
          pendingCount++;

          const sn = Number(row.getCell(1).value) || pendingCount;
          const cj = CalculationEngine.normalizeCJ(rawCj);
          const bl = row.getCell(3).value?.toString()?.trim() || '';
          const containers = row.getCell(4).value?.toString()?.trim() || '';
          const details = row.getCell(5).value?.toString()?.trim() || '';
          let poNo = row.getCell(6).value?.toString()?.trim() || 'Pending';
          const totalCell = row.getCell(7);
          const comment = row.getCell(8).value?.toString()?.trim() || '';

          let amount = 0;
          let formulaStr: string | null = null;
          if (typeof totalCell.value === 'object' && totalCell.value !== null && 'result' in (totalCell.value as any)) {
            amount = Number((totalCell.value as any).result) || 0;
            formulaStr = String((totalCell.value as any).formula);
          } else if (typeof totalCell.value === 'number') {
            amount = totalCell.value;
          }

          const classification = CalculationEngine.classifyCharge(details);

          // Determine processing status based on cross-sheet evidence
          const matchKey = `${cj}|${details.toLowerCase()}`;
          let status: ProcessingStatus = 'PENDING';
          let queryReason: string | null = null;

          if (billedMap.has(matchKey)) {
            const billedInfo = billedMap.get(matchKey)!;
            status = 'BILLED';
            if (billedInfo.poNo && billedInfo.poNo !== 'Pending') {
              poNo = billedInfo.poNo;
            }
          } else if (queriedMap.has(matchKey)) {
            const queriedInfo = queriedMap.get(matchKey)!;
            status = 'QUERIED';
            queryReason = queriedInfo.comment;
          }

          // Generate stable charge ID
          const chargeId = `CHG-${cj}-${classification}-${sn}`;

          const srcId = `SRC-${batchId}-PendingPO-${r}`;
          insertSourceRow.run(srcId, batchId, 'Pending PO', r, JSON.stringify({
            sn,
            cj: rawCj,
            bl,
            containers,
            details,
            poNo,
            amount,
            formula: formulaStr,
            comment
          }), now);

          // Upsert parent shipment if not yet exists
          upsertShipment.run(cj, rawCj, bl, null, null, null, null, null, 'PENDING', now, now);

          upsertCharge.run(
            chargeId, batchId, srcId, sn, rawCj, cj, bl, containers,
            details, classification, poNo, amount, formulaStr, comment,
            status, 0, queryReason, now, now
          );
        });
      }

      // 5. Aggregate charges for each CJ into shipment_details_24
      const allShipmentIds = db.prepare('SELECT id, raw_cj FROM shipments').all() as { id: string; raw_cj: string }[];
      for (const ship of allShipmentIds) {
        const cj = ship.id;
        const charges = db.prepare(`
          SELECT classification, amount FROM charge_entries WHERE normalized_cj = ?
        `).all(cj) as { classification: ChargeClassification; amount: number }[];

        let storageCharges = 0;
        let cwrCharges = 0;
        let reeferCharges = 0;
        let transportCharges = 0;
        let clearingCharges = 0;

        for (const chg of charges) {
          if (chg.classification === 'STORAGE') storageCharges += chg.amount;
          else if (chg.classification === 'CWR') cwrCharges += chg.amount;
          else if (chg.classification === 'REEFER_MONITORING') reeferCharges += chg.amount;
          else if (chg.classification === 'TRANSPORT') transportCharges += chg.amount;
          else if (chg.classification === 'CLEARING' || chg.classification === 'LIFT') clearingCharges += chg.amount;
        }

        const currentDetails = db.prepare('SELECT * FROM shipment_details_24 WHERE shipment_id = ?').get(cj) as any;
        const metrics = CalculationEngine.computeShipmentMetrics({
          allocationRequestDate: currentDetails?.allocation_request_date,
          allocationDate: currentDetails?.allocation_date,
          docsReceivedDate: currentDetails?.docs_received_date,
          dischargeDate: currentDetails?.discharge_date,
          doDate: currentDetails?.do_date,
          storageCharges,
          cwrCharges,
          reeferCharges,
          transportCharges,
          clearingCharges
        });

        if (currentDetails) {
          db.prepare(`
            UPDATE shipment_details_24 SET
              storage_amount = ?,
              cwr_amount = ?,
              transport_total = ?,
              clearing_total = ?,
              client_total = ?,
              delays_in_allocation = ?,
              clearance = ?,
              client_delay = ?,
              updated_at = ?
            WHERE shipment_id = ?
          `).run(
            metrics.storageAmount,
            metrics.cwrAmount,
            metrics.transportTotal,
            metrics.clearingTotal,
            metrics.clientTotal,
            metrics.delaysInAllocation,
            metrics.clearance,
            metrics.clientDelay,
            now,
            cj
          );
        } else {
          upsertShipmentDetails.run(
            cj, ship.raw_cj, null, null, null, null, null, null, null, null,
            null, null, null, null, metrics.delaysInAllocation, null, null,
            metrics.clearance, metrics.clientDelay, metrics.storageAmount,
            metrics.cwrAmount, null, metrics.transportTotal, metrics.clearingTotal,
            metrics.clientTotal, JSON.stringify({}), 0, 0, null, null, now
          );
        }
      }

      // Record batch completion
      db.prepare(`
        UPDATE import_batches SET
          total_rows = ?,
          pending_po_rows = ?,
          report_rows = ?,
          billed_rows = ?,
          queried_rows = ?,
          summary_blocks = ?,
          status = 'COMPLETED',
          notes = ?
        WHERE id = ?
      `).run(
        pendingCount + reportCount + billedCount + queriedCount,
        pendingCount, reportCount, billedCount, queriedCount, summaryCount,
        `Successfully ingested ${pendingCount} charges across ${allShipmentIds.length} CJs`,
        batchId
      );

      insertAudit.run(
        `AUD-${Date.now()}-1`, 'import_batches', batchId, 'status',
        null, 'COMPLETED', 'IMPORT', `Imported ${originalFilename} with hash ${fileHash.slice(0, 8)}`,
        'authorized_operator', now
      );
    });

    transaction();

    return {
      batchId,
      summary: {
        pendingRows: pendingCount,
        reportRows: reportCount,
        billedRows: billedCount,
        queriedRows: queriedCount
      }
    };
  }
}
