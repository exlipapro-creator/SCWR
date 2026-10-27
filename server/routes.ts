import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, initDatabase } from './db.ts';
import { CalculationEngine, ChargeClassification, ProcessingStatus } from './calculation-engine.ts';
import { IngestionService } from './ingestion-service.ts';
import { ExportService } from './export-service.ts';

const router = express.Router();
const upload = multer({ dest: path.resolve('data/uploads') });

// Ensure DB initialized
initDatabase();

// 1. Health & System Status
router.get('/health', (_req: Request, res: Response) => {
  try {
    const batchCount = (db.prepare('SELECT COUNT(*) as cnt FROM import_batches').get() as any)?.cnt || 0;
    const chargeCount = (db.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any)?.cnt || 0;
    const shipmentCount = (db.prepare('SELECT COUNT(*) as cnt FROM shipments').get() as any)?.cnt || 0;
    res.json({
      status: 'ok',
      database: 'connected',
      batches: batchCount,
      charges: chargeCount,
      shipments: shipmentCount,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 2. Overview Dashboard Metrics
router.get('/overview', (_req: Request, res: Response) => {
  try {
    const totalCharges = (db.prepare('SELECT COUNT(*) as count, SUM(amount) as sum FROM charge_entries').get() as any) || { count: 0, sum: 0 };
    const statusCounts = db.prepare(`
      SELECT processing_status, COUNT(*) as count, SUM(amount) as sum
      FROM charge_entries
      GROUP BY processing_status
    `).all() as any[];

    const classCounts = db.prepare(`
      SELECT classification, COUNT(*) as count, SUM(amount) as sum
      FROM charge_entries
      GROUP BY classification
    `).all() as any[];

    const shipmentMetrics = (db.prepare(`
      SELECT 
        COUNT(*) as total_shipments,
        SUM(storage_amount) as total_storage,
        SUM(cwr_amount) as total_cwr,
        SUM(client_total) as grand_client_total,
        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_count,
        SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) as draft_count
      FROM shipment_details_24
    `).get() as any) || {};

    const containerCount = (db.prepare('SELECT COUNT(*) as cnt FROM containers').get() as any)?.cnt || 0;
    const recentBatches = db.prepare('SELECT * FROM import_batches ORDER BY imported_at DESC LIMIT 5').all();
    const recentAudits = db.prepare('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 8').all();

    // Query for unsummarized active pending charges
    const pendingWithoutSummary = db.prepare(`
      SELECT DISTINCT c.normalized_cj, c.details, c.amount, c.po_no, c.comment
      FROM charge_entries c
      LEFT JOIN shipment_details_24 s ON c.normalized_cj = s.shipment_id
      WHERE c.processing_status = 'PENDING' AND (s.storage_amount = 0 AND s.cwr_amount = 0)
    `).all();

    res.json({
      totalCharges: {
        count: totalCharges.count,
        value: Math.round((totalCharges.sum || 0) * 100) / 100
      },
      statusBreakdown: statusCounts,
      classificationBreakdown: classCounts,
      shipmentMetrics: {
        totalShipments: shipmentMetrics.total_shipments || 0,
        totalContainers: containerCount,
        totalStorage: Math.round((shipmentMetrics.total_storage || 0) * 100) / 100,
        totalCWR: Math.round((shipmentMetrics.total_cwr || 0) * 100) / 100,
        grandClientTotal: Math.round((shipmentMetrics.grand_client_total || 0) * 100) / 100,
        verifiedCount: shipmentMetrics.verified_count || 0,
        draftCount: shipmentMetrics.draft_count || 0
      },
      recentBatches,
      recentAudits,
      pendingWithoutSummary
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Pending PO Work Queue
router.get('/pending-po', (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || '';
    const classification = (req.query.classification as string)?.trim() || '';
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    let query = 'SELECT * FROM charge_entries WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (normalized_cj LIKE ? OR bl LIKE ? OR container_info LIKE ? OR details LIKE ? OR comment LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (status) {
      query += ' AND processing_status = ?';
      params.push(status);
    }
    if (classification) {
      query += ' AND classification = ?';
      params.push(classification);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const totalCount = (db.prepare(countQuery).get(...params) as any)?.total || 0;

    query += ' ORDER BY sn ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    res.json({
      rows,
      totalCount,
      limit,
      offset
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Charge Processing Status / PO / Notes
router.patch('/charge/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { processing_status, po_no, comment, query_reason, is_verified, classification } = req.body;

    const existing = db.prepare('SELECT * FROM charge_entries WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Charge entry not found' });
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const params: any[] = [];

    if (processing_status !== undefined) {
      updates.push('processing_status = ?');
      params.push(processing_status);
      db.prepare(`
        INSERT INTO audit_events (id, entity_type, entity_id, field_name, old_value, new_value, action, reason, actor, created_at)
        VALUES (?, 'charge_entries', ?, 'processing_status', ?, ?, 'STATUS_UPDATE', ?, 'authorized_operator', ?)
      `).run(`AUD-${Date.now()}-stat`, id, existing.processing_status, processing_status, query_reason || 'Status updated', now);
    }

    if (po_no !== undefined) {
      updates.push('po_no = ?');
      params.push(po_no);
      db.prepare(`
        INSERT INTO audit_events (id, entity_type, entity_id, field_name, old_value, new_value, action, reason, actor, created_at)
        VALUES (?, 'charge_entries', ?, 'po_no', ?, ?, 'PO_ASSIGNMENT', 'PO assigned', 'authorized_operator', ?)
      `).run(`AUD-${Date.now()}-po`, id, existing.po_no, po_no, now);
    }

    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }
    if (query_reason !== undefined) {
      updates.push('query_reason = ?');
      params.push(query_reason);
    }
    if (is_verified !== undefined) {
      updates.push('is_verified = ?');
      params.push(is_verified ? 1 : 0);
    }
    if (classification !== undefined) {
      updates.push('classification = ?');
      params.push(classification);
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    db.prepare(`UPDATE charge_entries SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Recalculate parent CJ totals
    const cj = existing.normalized_cj;
    const charges = db.prepare(`SELECT classification, amount FROM charge_entries WHERE normalized_cj = ?`).all(cj) as any[];
    let storageCharges = 0;
    let cwrCharges = 0;
    let reeferCharges = 0;
    for (const c of charges) {
      if (c.classification === 'STORAGE') storageCharges += c.amount;
      else if (c.classification === 'CWR') cwrCharges += c.amount;
      else if (c.classification === 'REEFER_MONITORING') reeferCharges += c.amount;
    }

    const currentDetails = db.prepare('SELECT * FROM shipment_details_24 WHERE shipment_id = ?').get(cj) as any;
    if (currentDetails) {
      const metrics = CalculationEngine.computeShipmentMetrics({
        allocationRequestDate: currentDetails.allocation_request_date,
        allocationDate: currentDetails.allocation_date,
        docsReceivedDate: currentDetails.docs_received_date,
        dischargeDate: currentDetails.discharge_date,
        doDate: currentDetails.do_date,
        storageCharges,
        cwrCharges,
        reeferCharges,
        transportCharges: currentDetails.transport_total,
        clearingCharges: currentDetails.clearing_total
      });

      db.prepare(`
        UPDATE shipment_details_24 SET
          storage_amount = ?,
          cwr_amount = ?,
          client_total = ?,
          updated_at = ?
        WHERE shipment_id = ?
      `).run(metrics.storageAmount, metrics.cwrAmount, metrics.clientTotal, now, cj);
    }

    const updated = db.prepare('SELECT * FROM charge_entries WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Search Shipments by CJ or BL
router.get('/shipments', (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim() || '';
    if (!q) {
      const all = db.prepare(`
        SELECT s.*, d.storage_amount, d.cwr_amount, d.client_total, d.is_verified, d.is_draft
        FROM shipments s
        LEFT JOIN shipment_details_24 d ON s.id = d.shipment_id
        ORDER BY s.id ASC
        LIMIT 100
      `).all();
      return res.json(all);
    }

    const normCj = CalculationEngine.normalizeCJ(q);
    const normBl = CalculationEngine.normalizeBL(q);

    const matches = db.prepare(`
      SELECT s.*, d.storage_amount, d.cwr_amount, d.client_total, d.is_verified, d.is_draft
      FROM shipments s
      LEFT JOIN shipment_details_24 d ON s.id = d.shipment_id
      WHERE s.id LIKE ? OR s.bl LIKE ? OR s.raw_cj LIKE ? OR s.id = ? OR s.bl = ?
      ORDER BY s.id ASC
    `).all(`%${normCj}%`, `%${normBl}%`, `%${q}%`, normCj, normBl);

    res.json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get Complete 24-Field Shipment Details
router.get('/shipment/:cj', (req: Request, res: Response) => {
  try {
    const normCj = CalculationEngine.normalizeCJ(req.params.cj);
    let details = db.prepare('SELECT * FROM shipment_details_24 WHERE shipment_id = ?').get(normCj) as any;
    const parent = db.prepare('SELECT * FROM shipments WHERE id = ?').get(normCj) as any;
    const containers = db.prepare('SELECT * FROM containers WHERE shipment_id = ?').all(normCj);
    const charges = db.prepare('SELECT * FROM charge_entries WHERE normalized_cj = ? ORDER BY sn ASC').all(normCj);

    if (!details && parent) {
      // Derive default details
      details = {
        shipment_id: normCj,
        file_no: parent.raw_cj || normCj,
        bl: parent.bl,
        size: parent.size,
        shipping_line: parent.shipping_line,
        storage_amount: 0,
        cwr_amount: 0,
        transport_total: 0,
        clearing_total: 0,
        client_total: 0,
        provenance_map: '{}',
        is_draft: 0,
        is_verified: 0
      };
    }

    res.json({
      details,
      parent,
      containers,
      charges
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Update 24-Field Shipment Details
router.put('/shipment/:cj', (req: Request, res: Response) => {
  try {
    const normCj = CalculationEngine.normalizeCJ(req.params.cj);
    const body = req.body;
    const now = new Date().toISOString();

    const charges = db.prepare('SELECT classification, amount FROM charge_entries WHERE normalized_cj = ?').all(normCj) as any[];
    let storageCharges = 0;
    let cwrCharges = 0;
    let reeferCharges = 0;
    for (const c of charges) {
      if (c.classification === 'STORAGE') storageCharges += c.amount;
      else if (c.classification === 'CWR') cwrCharges += c.amount;
      else if (c.classification === 'REEFER_MONITORING') reeferCharges += c.amount;
    }

    // Recompute dependent metrics
    const metrics = CalculationEngine.computeShipmentMetrics({
      allocationRequestDate: body.allocation_request_date,
      allocationDate: body.allocation_date,
      docsReceivedDate: body.docs_received_date,
      dischargeDate: body.discharge_date,
      doDate: body.do_date,
      storageCharges,
      cwrCharges,
      reeferCharges,
      transportCharges: Number(body.transport_total || 0),
      clearingCharges: Number(body.clearing_total || 0)
    });

    const isDraft = body.is_draft ? 1 : 0;
    const isVerified = body.is_verified ? 1 : 0;
    const verifiedBy = isVerified ? (body.verified_by || 'authorized_operator') : null;
    const verifiedAt = isVerified ? now : null;

    db.prepare(`
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
        file_no = excluded.file_no,
        bl = excluded.bl,
        size = excluded.size,
        shipping_line = excluded.shipping_line,
        docs_received_date = excluded.docs_received_date,
        discharge_date = excluded.discharge_date,
        carry_in_date = excluded.carry_in_date,
        do_date = excluded.do_date,
        assessment_notice = excluded.assessment_notice,
        release_order_print_date = excluded.release_order_print_date,
        port_charges = excluded.port_charges,
        allocation_request_date = excluded.allocation_request_date,
        allocation_date = excluded.allocation_date,
        delays_in_allocation = excluded.delays_in_allocation,
        truck_number = excluded.truck_number,
        loaded = excluded.loaded,
        clearance = excluded.clearance,
        client_delay = excluded.client_delay,
        storage_amount = excluded.storage_amount,
        cwr_amount = excluded.cwr_amount,
        comments = excluded.comments,
        transport_total = excluded.transport_total,
        clearing_total = excluded.clearing_total,
        client_total = excluded.client_total,
        provenance_map = excluded.provenance_map,
        is_draft = excluded.is_draft,
        is_verified = excluded.is_verified,
        verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        updated_at = excluded.updated_at
    `).run(
      normCj, body.file_no || normCj, body.bl, body.size, body.shipping_line,
      CalculationEngine.parseDateOnly(body.docs_received_date),
      CalculationEngine.parseDateOnly(body.discharge_date),
      CalculationEngine.parseDateOnly(body.carry_in_date),
      CalculationEngine.parseDateOnly(body.do_date),
      CalculationEngine.parseDateOnly(body.assessment_notice),
      CalculationEngine.parseDateOnly(body.release_order_print_date),
      CalculationEngine.parseDateOnly(body.port_charges),
      CalculationEngine.parseDateOnly(body.allocation_request_date),
      CalculationEngine.parseDateOnly(body.allocation_date),
      metrics.delaysInAllocation, body.truck_number, body.loaded,
      metrics.clearance, metrics.clientDelay, metrics.storageAmount, metrics.cwrAmount,
      body.comments, metrics.transportTotal, metrics.clearingTotal, metrics.clientTotal,
      JSON.stringify(body.provenance_map || {}), isDraft, isVerified, verifiedBy, verifiedAt, now
    );

    db.prepare(`
      INSERT INTO audit_events (id, entity_type, entity_id, field_name, old_value, new_value, action, reason, actor, created_at)
      VALUES (?, 'shipment_details_24', ?, 'FULL_UPDATE', null, null, ?, ?, ?, ?)
    `).run(`AUD-${Date.now()}-ship`, normCj, isDraft ? 'DRAFT_SAVED' : 'RECORD_UPDATED', body.change_reason || 'Manual form edit', verifiedBy || 'authorized_operator', now);

    const updated = db.prepare('SELECT * FROM shipment_details_24 WHERE shipment_id = ?').get(normCj);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Consolidated CJ Summaries
router.get('/cj-summaries', (_req: Request, res: Response) => {
  try {
    const shipments = db.prepare(`
      SELECT s.*, d.docs_received_date, d.discharge_date, d.do_date, d.port_charges,
             d.allocation_request_date, d.allocation_date, d.delays_in_allocation,
             d.clearance, d.client_delay, d.storage_amount, d.cwr_amount,
             d.transport_total, d.clearing_total, d.client_total, d.is_verified, d.is_draft, d.comments
      FROM shipments s
      LEFT JOIN shipment_details_24 d ON s.id = d.shipment_id
      ORDER BY s.id ASC
    `).all() as any[];

    const result = shipments.map(ship => {
      const containers = db.prepare('SELECT * FROM containers WHERE shipment_id = ?').all(ship.id);
      const charges = db.prepare('SELECT * FROM charge_entries WHERE normalized_cj = ? ORDER BY sn ASC').all(ship.id);
      return {
        ...ship,
        containers,
        charges
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Custom Reports Query Engine
router.get('/reports/custom', (req: Request, res: Response) => {
  try {
    const { cj, bl, status, classification, shipping_line } = req.query;
    let query = `
      SELECT c.*, s.shipping_line, s.customer, s.consignee, s.size as container_size
      FROM charge_entries c
      LEFT JOIN shipments s ON c.normalized_cj = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (cj) {
      query += ' AND c.normalized_cj LIKE ?';
      params.push(`%${CalculationEngine.normalizeCJ(cj as string)}%`);
    }
    if (bl) {
      query += ' AND c.bl LIKE ?';
      params.push(`%${CalculationEngine.normalizeBL(bl as string)}%`);
    }
    if (status) {
      query += ' AND c.processing_status = ?';
      params.push(status);
    }
    if (classification) {
      query += ' AND c.classification = ?';
      params.push(classification);
    }
    if (shipping_line) {
      query += ' AND s.shipping_line LIKE ?';
      params.push(`%${shipping_line}%`);
    }

    query += ' ORDER BY c.sn ASC';
    const rows = db.prepare(query).all(...params) as any[];

    // Group by CJ
    const grouped: Record<string, { cj: string; bl: string; shippingLine: string; items: any[]; totalAmount: number }> = {};
    let grandTotal = 0;

    for (const r of rows) {
      const key = r.normalized_cj;
      if (!grouped[key]) {
        grouped[key] = {
          cj: key,
          bl: r.bl,
          shippingLine: r.shipping_line || '—',
          items: [],
          totalAmount: 0
        };
      }
      grouped[key].items.push(r);
      grouped[key].totalAmount += r.amount;
      grandTotal += r.amount;
    }

    res.json({
      totalLineItems: rows.length,
      grandTotal: Math.round(grandTotal * 100) / 100,
      groupedByCJ: Object.values(grouped),
      allRows: rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Workbook Ingestion: Preview
router.post('/import/preview', upload.single('workbook'), async (req: Request, res: Response) => {
  try {
    let filePath = req.file?.path;
    let filename = req.file?.originalname || 'uploaded_workbook.xlsx';

    if (!filePath) {
      // Default to reference file if no upload provided
      filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
      filename = 'Storage_and_CWR_Charges_SEPT_2026_.xlsx';
    }

    const preview = await IngestionService.previewWorkbook(filePath, filename);
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Workbook Ingestion: Commit
router.post('/import/commit', upload.single('workbook'), async (req: Request, res: Response) => {
  try {
    let filePath = req.file?.path;
    let filename = req.file?.originalname || 'uploaded_workbook.xlsx';

    if (!filePath) {
      filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
      filename = 'Storage_and_CWR_Charges_SEPT_2026_.xlsx';
    }

    const result = await IngestionService.importWorkbook(filePath, filename);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Excel Export & Verification
router.post('/export', async (_req: Request, res: Response) => {
  try {
    const { outputPath, report } = await ExportService.generateExportWorkbook();
    const filename = path.basename(outputPath);
    res.json({
      downloadUrl: `/api/export/download/${filename}`,
      filename,
      report
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Download Exported File
router.get('/export/download/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.resolve('data/exports', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Exported file not found');
  }
  res.download(filePath, filename);
});

// 14. Audit History
router.get('/audit-trail', (_req: Request, res: Response) => {
  try {
    const events = db.prepare('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 200').all();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Backup & Restore
router.post('/backup/create', (_req: Request, res: Response) => {
  try {
    const backupDir = path.resolve('data/backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_cwr_storage_${now}.sqlite`;
    const backupPath = path.join(backupDir, backupName);

    // SQLite online backup via vacuum into
    db.prepare(`VACUUM INTO ?`).run(backupPath);

    const stats = fs.statSync(backupPath);
    const counts = {
      batches: (db.prepare('SELECT COUNT(*) as c FROM import_batches').get() as any).c,
      charges: (db.prepare('SELECT COUNT(*) as c FROM charge_entries').get() as any).c,
      shipments: (db.prepare('SELECT COUNT(*) as c FROM shipments').get() as any).c
    };

    const id = `BCK-${Date.now()}`;
    db.prepare(`
      INSERT INTO backups (id, filename, file_path, size_bytes, record_counts, is_tested, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, backupName, backupPath, stats.size, JSON.stringify(counts), new Date().toISOString());

    res.json({ id, filename: backupName, size: stats.size, counts, isTested: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/backups', (_req: Request, res: Response) => {
  try {
    const list = db.prepare('SELECT * FROM backups ORDER BY created_at DESC').all();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
