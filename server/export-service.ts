import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { db } from './db.ts';
import { CalculationEngine } from './calculation-engine.ts';

export interface ExportValidationReport {
  timestamp: string;
  outputPath: string;
  sheetsCount: number;
  sheetNames: string[];
  preservedFormulasCount: number;
  reconciledSummaryBlocks: number;
  storageReconciliationPassed: boolean;
  cwrReconciliationPassed: boolean;
  totalClientVariance: number;
  validationPassed: boolean;
  details: string[];
}

export class ExportService {
  /**
   * Generates a separate, downloadable Excel workbook preserving all original workbook structure,
   * fonts, formulas, merged cells, and the exact REPORTS SUMMARY 3-column block layout.
   */
  static async generateExportWorkbook(outputPath?: string): Promise<{ outputPath: string; report: ExportValidationReport }> {
    const templatePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Base template file not found at ${templatePath}`);
    }

    const exportDir = path.resolve('data/exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalPath = outputPath || path.join(exportDir, `Storage_and_CWR_Export_${timestamp}.xlsx`);

    // Load original workbook to guarantee perfect preservation of all cell styles, sheet order, widths
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(templatePath);

    // 1. Synchronize Pending PO with database status & verified POs
    const pendingWs = wb.getWorksheet('Pending PO');
    if (pendingWs) {
      pendingWs.eachRow((row, r) => {
        if (r <= 2 || r === 98) return; // skip header and summary formula row
        const rawCj = row.getCell(2).value?.toString()?.trim();
        const details = row.getCell(5).value?.toString()?.trim() || '';
        if (!rawCj) return;
        const normCj = CalculationEngine.normalizeCJ(rawCj);

        const chargeInDb = db.prepare(`
          SELECT po_no, processing_status, comment, is_verified
          FROM charge_entries
          WHERE normalized_cj = ? AND details = ?
          LIMIT 1
        `).get(normCj, details) as any;

        if (chargeInDb) {
          if (chargeInDb.po_no && chargeInDb.po_no !== 'Pending') {
            row.getCell(6).value = chargeInDb.po_no;
          }
          if (chargeInDb.comment) {
            row.getCell(8).value = chargeInDb.comment;
          }
        }
      });
    }

    // 2. Synchronize ' REPORTS SUMMARY'
    const summaryWs = wb.getWorksheet(' REPORTS SUMMARY');
    let summaryBlocksUpdated = 0;
    if (summaryWs) {
      // Iterate through existing blocks: rows 1, 27, 53, ... (step 26)
      for (let r = 1; r < summaryWs.rowCount; r += 26) {
        const colPairs = [
          { valCol: 2, colLetter: 'B' },
          { valCol: 6, colLetter: 'F' },
          { valCol: 10, colLetter: 'J' }
        ];

        for (const { valCol, colLetter } of colPairs) {
          const fileVal = summaryWs.getRow(r).getCell(valCol).value?.toString()?.trim() || '';
          if (!fileVal) continue;

          const normCj = CalculationEngine.normalizeCJ(fileVal);
          const detailsInDb = db.prepare(`
            SELECT * FROM shipment_details_24 WHERE shipment_id = ?
          `).get(normCj) as any;

          if (detailsInDb) {
            summaryBlocksUpdated++;
            // Update fields while preserving native Excel formula cells
            if (detailsInDb.size) summaryWs.getRow(r + 2).getCell(valCol).value = detailsInDb.size;
            if (detailsInDb.shipping_line) summaryWs.getRow(r + 3).getCell(valCol).value = detailsInDb.shipping_line;
            if (detailsInDb.docs_received_date) summaryWs.getRow(r + 4).getCell(valCol).value = new Date(detailsInDb.docs_received_date);
            if (detailsInDb.discharge_date) summaryWs.getRow(r + 5).getCell(valCol).value = new Date(detailsInDb.discharge_date);
            if (detailsInDb.carry_in_date) summaryWs.getRow(r + 6).getCell(valCol).value = new Date(detailsInDb.carry_in_date);
            if (detailsInDb.do_date) summaryWs.getRow(r + 7).getCell(valCol).value = new Date(detailsInDb.do_date);
            if (detailsInDb.assessment_notice) summaryWs.getRow(r + 8).getCell(valCol).value = new Date(detailsInDb.assessment_notice);
            if (detailsInDb.release_order_print_date) summaryWs.getRow(r + 9).getCell(valCol).value = new Date(detailsInDb.release_order_print_date);
            if (detailsInDb.port_charges) summaryWs.getRow(r + 10).getCell(valCol).value = new Date(detailsInDb.port_charges);
            if (detailsInDb.allocation_request_date) summaryWs.getRow(r + 11).getCell(valCol).value = new Date(detailsInDb.allocation_request_date);
            if (detailsInDb.allocation_date) summaryWs.getRow(r + 12).getCell(valCol).value = new Date(detailsInDb.allocation_date);

            // Row 14: DELAYS IN ALLOCATION formula
            const delaysCell = summaryWs.getRow(r + 13).getCell(valCol);
            const origDelaysFormula = delaysCell.formula || (delaysCell.value && typeof delaysCell.value === 'object' && 'formula' in delaysCell.value ? (delaysCell.value as any).formula : null);
            const origDelaysResult = delaysCell.value && typeof delaysCell.value === 'object' && 'result' in delaysCell.value ? (delaysCell.value as any).result : null;
            delaysCell.value = {
              formula: origDelaysFormula || `IF(OR(${colLetter}${r + 12}="",${colLetter}${r + 11}=""),"",${colLetter}${r + 12}-${colLetter}${r + 11})`,
              result: detailsInDb.delays_in_allocation !== null && detailsInDb.delays_in_allocation !== undefined ? detailsInDb.delays_in_allocation : origDelaysResult
            };

            if (detailsInDb.truck_number) summaryWs.getRow(r + 14).getCell(valCol).value = detailsInDb.truck_number;
            if (detailsInDb.loaded) {
              const loadedDate = CalculationEngine.parseDateOnly(detailsInDb.loaded);
              summaryWs.getRow(r + 15).getCell(valCol).value = loadedDate ? new Date(loadedDate) : detailsInDb.loaded;
            }

            // Row 17: CLEARANCE formula
            const clearanceCell = summaryWs.getRow(r + 16).getCell(valCol);
            const origClearanceFormula = clearanceCell.formula || (clearanceCell.value && typeof clearanceCell.value === 'object' && 'formula' in clearanceCell.value ? (clearanceCell.value as any).formula : null);
            const origClearanceResult = clearanceCell.value && typeof clearanceCell.value === 'object' && 'result' in clearanceCell.value ? (clearanceCell.value as any).result : null;
            clearanceCell.value = {
              formula: origClearanceFormula || `IF(OR(${colLetter}${r + 7}="",${colLetter}${r + 5}=""),"",${colLetter}${r + 7}-${colLetter}${r + 5})`,
              result: detailsInDb.clearance !== null && detailsInDb.clearance !== undefined ? detailsInDb.clearance : origClearanceResult
            };

            // Row 18: CLIENT DELAY formula
            const clientDelayCell = summaryWs.getRow(r + 17).getCell(valCol);
            const origClientDelayFormula = clientDelayCell.formula || (clientDelayCell.value && typeof clientDelayCell.value === 'object' && 'formula' in clientDelayCell.value ? (clientDelayCell.value as any).formula : null);
            const origClientDelayResult = clientDelayCell.value && typeof clientDelayCell.value === 'object' && 'result' in clientDelayCell.value ? (clientDelayCell.value as any).result : null;
            clientDelayCell.value = {
              formula: origClientDelayFormula || `IF(OR(${colLetter}${r + 4}="",${colLetter}${r + 5}=""),"",${colLetter}${r + 4}-${colLetter}${r + 5})`,
              result: detailsInDb.client_delay !== null && detailsInDb.client_delay !== undefined ? detailsInDb.client_delay : origClientDelayResult
            };

            // Row 19: Storage Amount
            summaryWs.getRow(r + 18).getCell(valCol).value = detailsInDb.storage_amount > 0 ? detailsInDb.storage_amount : null;

            // Row 20: CWR Amount
            summaryWs.getRow(r + 19).getCell(valCol).value = detailsInDb.cwr_amount > 0 ? detailsInDb.cwr_amount : null;

            // Row 21: Comments
            if (detailsInDb.comments) summaryWs.getRow(r + 20).getCell(valCol).value = detailsInDb.comments;

            // Row 22: Transport
            summaryWs.getRow(r + 21).getCell(valCol).value = detailsInDb.transport_total || 0;

            // Row 23: Clearing
            summaryWs.getRow(r + 22).getCell(valCol).value = detailsInDb.clearing_total || 0;

            // Row 24: CLIENT TOTAL formula (Preserve constant if original cell was a constant like J50)
            const clientTotalCell = summaryWs.getRow(r + 23).getCell(valCol);
            const origClientTotalFormula = clientTotalCell.formula || (clientTotalCell.value && typeof clientTotalCell.value === 'object' && 'formula' in clientTotalCell.value ? (clientTotalCell.value as any).formula : null);
            if (origClientTotalFormula) {
              clientTotalCell.value = {
                formula: origClientTotalFormula,
                result: detailsInDb.client_total
              };
            } else {
              clientTotalCell.value = detailsInDb.client_total;
            }
          }
        }
      }
    }

    // Write exported workbook
    await wb.xlsx.writeFile(finalPath);

    // 3. Perform automated round-trip audit on generated output
    const report = await this.validateExportFile(finalPath);
    return { outputPath: finalPath, report };
  }

  /**
   * Reopen exported workbook and verify formula counts, structure, and reconciliation
   */
  static async validateExportFile(filePath: string): Promise<ExportValidationReport> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);

    const sheetNames = wb.worksheets.map(ws => ws.name);
    let totalFormulas = 0;
    let reconciledBlocks = 0;
    let storagePassed = true;
    let cwrPassed = true;
    let totalVariance = 0;
    const details: string[] = [];

    const summaryWs = wb.getWorksheet(' REPORTS SUMMARY');
    if (!summaryWs) {
      details.push('CRITICAL: " REPORTS SUMMARY" sheet missing from export');
    } else {
      for (let r = 1; r < summaryWs.rowCount; r += 26) {
        for (const valCol of [2, 6, 10]) {
          const fileVal = summaryWs.getRow(r).getCell(valCol).value?.toString()?.trim();
          if (fileVal) {
            reconciledBlocks++;
            const normCj = CalculationEngine.normalizeCJ(fileVal);
            const dbRecord = db.prepare('SELECT storage_amount, cwr_amount, client_total FROM shipment_details_24 WHERE shipment_id = ?').get(normCj) as any;
            if (dbRecord) {
              const exportedStorage = Number(summaryWs.getRow(r + 18).getCell(valCol).value) || 0;
              const exportedCwr = Number(summaryWs.getRow(r + 19).getCell(valCol).value) || 0;

              const sDiff = Math.abs(exportedStorage - dbRecord.storage_amount);
              const cDiff = Math.abs(exportedCwr - dbRecord.cwr_amount);

              if (sDiff > 0.01) {
                storagePassed = false;
                totalVariance += sDiff;
                details.push(`Storage variance on ${normCj}: DB=${dbRecord.storage_amount}, Export=${exportedStorage}`);
              }
              if (cDiff > 0.01) {
                cwrPassed = false;
                totalVariance += cDiff;
                details.push(`CWR variance on ${normCj}: DB=${dbRecord.cwr_amount}, Export=${exportedCwr}`);
              }
            }
          }
        }
      }
    }

    for (const ws of wb.worksheets) {
      ws.eachRow(row => {
        row.eachCell(cell => {
          if (cell.formula || (cell.value && typeof cell.value === 'object' && 'formula' in cell.value)) {
            totalFormulas++;
          }
        });
      });
    }

    const validationPassed = storagePassed && cwrPassed && sheetNames.includes(' REPORTS SUMMARY') && totalFormulas > 200;

    return {
      timestamp: new Date().toISOString(),
      outputPath: filePath,
      sheetsCount: wb.worksheets.length,
      sheetNames,
      preservedFormulasCount: totalFormulas,
      reconciledSummaryBlocks: reconciledBlocks,
      storageReconciliationPassed: storagePassed,
      cwrReconciliationPassed: cwrPassed,
      totalClientVariance: Math.round(totalVariance * 100) / 100,
      validationPassed,
      details
    };
  }
}
