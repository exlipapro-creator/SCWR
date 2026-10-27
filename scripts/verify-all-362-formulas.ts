import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function verifyAll362Formulas() {
  const originalPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  
  // Find latest export
  const exportsDir = path.resolve('data/exports');
  const files = fs.readdirSync(exportsDir).filter(f => f.endsWith('.xlsx')).sort();
  const latestExport = files[files.length - 1];
  const exportPath = path.join(exportsDir, latestExport);
  console.log('Comparing against latest export:', latestExport);

  const wbOrig = new ExcelJS.Workbook();
  await wbOrig.xlsx.readFile(originalPath);

  const wbExport = new ExcelJS.Workbook();
  await wbExport.xlsx.readFile(exportPath);

  const isFormula = (cell: ExcelJS.Cell): boolean => {
    if (cell.formula) return true;
    if (cell.value && typeof cell.value === 'object' && 'formula' in (cell.value as any)) return true;
    return false;
  };

  const getFormulaString = (cell: ExcelJS.Cell): string => {
    if (cell.formula) return cell.formula;
    if (cell.value && typeof cell.value === 'object' && 'formula' in (cell.value as any)) {
      return (cell.value as any).formula;
    }
    return '';
  };

  const getCachedValue = (cell: ExcelJS.Cell): any => {
    if (cell.value && typeof cell.value === 'object' && 'result' in (cell.value as any)) {
      return (cell.value as any).result;
    }
    return cell.value;
  };

  interface FormulaDiff {
    sheet: string;
    coord: string;
    formulaOrig: string;
    formulaExport: string;
    formulaMatch: boolean;
    cachedOrig: any;
    cachedExport: any;
    cachedMatch: boolean;
    notes: string;
  }

  const results: FormulaDiff[] = [];
  let totalOrigFormulas = 0;
  let totalExportFormulas = 0;

  for (const wsOrig of wbOrig.worksheets) {
    const wsExport = wbExport.getWorksheet(wsOrig.name);
    if (!wsExport) {
      console.error(`Missing sheet in export: ${wsOrig.name}`);
      continue;
    }

    wsOrig.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (isFormula(cell)) {
          totalOrigFormulas++;
          const coord = cell.address;
          const exportCell = wsExport.getCell(coord);

          const formulaOrig = getFormulaString(cell);
          const formulaExport = getFormulaString(exportCell);
          const cachedOrig = getCachedValue(cell);
          const cachedExport = getCachedValue(exportCell);

          const formulaMatch = formulaOrig.toUpperCase().replace(/\s+/g, '') === formulaExport.toUpperCase().replace(/\s+/g, '');
          
          let cachedMatch = false;
          if (typeof cachedOrig === 'number' && typeof cachedExport === 'number') {
            cachedMatch = Math.abs(cachedOrig - cachedExport) < 0.001;
          } else {
            cachedMatch = String(cachedOrig) === String(cachedExport);
          }

          results.push({
            sheet: wsOrig.name,
            coord,
            formulaOrig,
            formulaExport,
            formulaMatch,
            cachedOrig,
            cachedExport,
            cachedMatch,
            notes: ''
          });
        }
      });
    });

    // Also count export formulas
    wsExport.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (isFormula(cell)) {
          totalExportFormulas++;
        }
      });
    });
  }

  console.log(`Original total formulas found: ${totalOrigFormulas}`);
  console.log(`Export total formulas found:   ${totalExportFormulas}`);

  const formulaMismatches = results.filter(r => !r.formulaMatch);
  const cachedMismatches = results.filter(r => !r.cachedMatch);

  console.log(`Formula string mismatches: ${formulaMismatches.length}`);
  console.log(`Cached value mismatches:   ${cachedMismatches.length}`);

  if (cachedMismatches.length > 0) {
    console.log('\n--- CACHED VALUE DIFFERENCES ---');
    for (const cm of cachedMismatches) {
      console.log(`[${cm.sheet}] ${cm.coord}: Formula="${cm.formulaOrig}" | OrigVal=${cm.cachedOrig} (${typeof cm.cachedOrig}) | ExportVal=${cm.cachedExport} (${typeof cm.cachedExport})`);
    }
  }

  // Check specifically leading space sheet
  const summaryWsOrig = wbOrig.getWorksheet(' REPORTS SUMMARY');
  const summaryWsExport = wbExport.getWorksheet(' REPORTS SUMMARY');
  console.log('\nChecking Leading Space in Sheet Name:');
  console.log('Original summary sheet name byte check:', Buffer.from(summaryWsOrig?.name || '').toString('hex'));
  console.log('Export summary sheet name byte check:  ', Buffer.from(summaryWsExport?.name || '').toString('hex'));
  console.log('Sheet name identical:', summaryWsOrig?.name === summaryWsExport?.name);

  // Check J50
  const j50Orig = summaryWsOrig?.getCell('J50');
  const j50Export = summaryWsExport?.getCell('J50');
  console.log('\nChecking Cell J50 in " REPORTS SUMMARY":');
  console.log('Original J50: type=', j50Orig?.type, 'value=', j50Orig?.value, 'formula=', j50Orig?.formula, 'isFormula=', isFormula(j50Orig!));
  console.log('Export J50:   type=', j50Export?.type, 'value=', j50Export?.value, 'formula=', j50Export?.formula, 'isFormula=', isFormula(j50Export!));
  console.log('J50 preserved as literal constant 220:', j50Export?.value === 220 && !isFormula(j50Export!));
}

verifyAll362Formulas().catch(console.error);
