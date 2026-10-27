import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function compareFormulas() {
  const originalPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const exportFiles = fs.readdirSync('data/exports').filter(f => f.endsWith('.xlsx')).sort();
  const latestExportPath = path.resolve('data/exports', exportFiles[exportFiles.length - 1]);

  console.log('Original File:', originalPath);
  console.log('Export File:', latestExportPath);

  const origWb = new ExcelJS.Workbook();
  await origWb.xlsx.readFile(originalPath);

  const expWb = new ExcelJS.Workbook();
  await expWb.xlsx.readFile(latestExportPath);

  let totalOrigFormulas = 0;
  let totalExpFormulas = 0;

  const origSheetMap = new Map<string, { count: number; formulas: Map<string, { formula: string; result: any }> }>();
  const expSheetMap = new Map<string, { count: number; formulas: Map<string, { formula: string; result: any }> }>();

  for (const ws of origWb.worksheets) {
    const fMap = new Map<string, { formula: string; result: any }>();
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        let f: string | undefined;
        let r: any;
        if (cell.formula) {
          f = cell.formula;
          r = cell.result;
        } else if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          f = (cell.value as any).formula;
          r = (cell.value as any).result;
        }
        if (f) {
          fMap.set(cell.address, { formula: f, result: r });
          totalOrigFormulas++;
        }
      });
    });
    origSheetMap.set(ws.name, { count: fMap.size, formulas: fMap });
  }

  for (const ws of expWb.worksheets) {
    const fMap = new Map<string, { formula: string; result: any }>();
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        let f: string | undefined;
        let r: any;
        if (cell.formula) {
          f = cell.formula;
          r = cell.result;
        } else if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
          f = (cell.value as any).formula;
          r = (cell.value as any).result;
        }
        if (f) {
          fMap.set(cell.address, { formula: f, result: r });
          totalExpFormulas++;
        }
      });
    });
    expSheetMap.set(ws.name, { count: fMap.size, formulas: fMap });
  }

  console.log('\n--- SHEET BY SHEET FORMULA COUNTS ---');
  console.log(`Original Total Formulas: ${totalOrigFormulas}`);
  console.log(`Exported Total Formulas: ${totalExpFormulas}`);
  console.log(`Difference: ${totalExpFormulas - totalOrigFormulas}`);

  const allSheetNames = Array.from(new Set([...origSheetMap.keys(), ...expSheetMap.keys()]));
  for (const sheetName of allSheetNames) {
    const origInfo = origSheetMap.get(sheetName) || { count: 0, formulas: new Map() };
    const expInfo = expSheetMap.get(sheetName) || { count: 0, formulas: new Map() };
    console.log(`Sheet "${sheetName}": Original=${origInfo.count}, Exported=${expInfo.count}, Diff=${expInfo.count - origInfo.count}`);

    // Find added formulas in exported
    for (const [addr, fObj] of expInfo.formulas.entries()) {
      if (!origInfo.formulas.has(addr)) {
        console.log(`  [ADDED IN EXPORT] ${sheetName}!${addr}: Formula="${fObj.formula}", Result=${JSON.stringify(fObj.result)}`);
        // What was in original at this address?
        const origCell = origWb.getWorksheet(sheetName)?.getCell(addr);
        console.log(`    (Original cell had value: ${JSON.stringify(origCell?.value)})`);
      } else {
        const origF = origInfo.formulas.get(addr)!;
        if (origF.formula !== fObj.formula) {
          console.log(`  [CHANGED FORMULA] ${sheetName}!${addr}: Orig="${origF.formula}" vs Exp="${fObj.formula}"`);
        }
      }
    }

    // Find removed formulas in exported
    for (const [addr, fObj] of origInfo.formulas.entries()) {
      if (!expInfo.formulas.has(addr)) {
        console.log(`  [REMOVED IN EXPORT] ${sheetName}!${addr}: OrigFormula="${fObj.formula}", Result=${JSON.stringify(fObj.result)}`);
        const expCell = expWb.getWorksheet(sheetName)?.getCell(addr);
        console.log(`    (Exported cell now has value: ${JSON.stringify(expCell?.value)})`);
      }
    }
  }
}

compareFormulas().catch(console.error);
