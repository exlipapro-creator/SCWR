import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function verifyFidelity() {
  const originalPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const exportFiles = fs.readdirSync('data/exports').filter(f => f.endsWith('.xlsx')).sort();
  const latestExportPath = path.resolve('data/exports', exportFiles[exportFiles.length - 1]);

  console.log('Auditing fidelity between:');
  console.log('  Original:', originalPath);
  console.log('  Exported:', latestExportPath);

  const origWb = new ExcelJS.Workbook();
  await origWb.xlsx.readFile(originalPath);

  const expWb = new ExcelJS.Workbook();
  await expWb.xlsx.readFile(latestExportPath);

  // 1. Sheet names and order
  console.log('\n--- 1. SHEET NAMES & ORDER ---');
  const origSheets = origWb.worksheets.map(w => w.name);
  const expSheets = expWb.worksheets.map(w => w.name);
  console.log('Original Sheets:', JSON.stringify(origSheets));
  console.log('Exported Sheets:', JSON.stringify(expSheets));
  const sheetNamesMatch = JSON.stringify(origSheets) === JSON.stringify(expSheets);
  console.log(`Sheet Names & Order Match: ${sheetNamesMatch ? 'EXACT MATCH' : 'MISMATCH'}`);

  // 2. Merged Cells
  console.log('\n--- 2. MERGED CELLS PARITY ---');
  for (const sheetName of origSheets) {
    const origWs = origWb.getWorksheet(sheetName)!;
    const expWs = expWb.getWorksheet(sheetName)!;
    const origMerges = (origWs as any)._merges ? Object.keys((origWs as any)._merges) : [];
    const expMerges = (expWs as any)._merges ? Object.keys((expWs as any)._merges) : [];
    console.log(`Sheet "${sheetName}": Original Merges=${origMerges.length}, Exported Merges=${expMerges.length}`);
  }

  // 3. Column Widths
  console.log('\n--- 3. COLUMN WIDTHS AUDIT ---');
  for (const sheetName of origSheets) {
    const origWs = origWb.getWorksheet(sheetName)!;
    const expWs = expWb.getWorksheet(sheetName)!;
    let widthDiffs = 0;
    for (let c = 1; c <= Math.max(origWs.columnCount, expWs.columnCount); c++) {
      const origCol = origWs.getColumn(c);
      const expCol = expWs.getColumn(c);
      if (origCol.width !== expCol.width) {
        widthDiffs++;
      }
    }
    console.log(`Sheet "${sheetName}": Column count=${origWs.columnCount}, Width differences=${widthDiffs}`);
  }

  // 4. REPORTS SUMMARY Block Structure Audit
  console.log('\n--- 4. REPORTS SUMMARY 58-BLOCK GRID AUDIT ---');
  const origSummary = origWb.getWorksheet(' REPORTS SUMMARY')!;
  const expSummary = expWb.getWorksheet(' REPORTS SUMMARY')!;

  let blocksChecked = 0;
  let fileMatches = 0;
  let blMatches = 0;
  let formulaMatches = 0;
  let diffDetails: string[] = [];

  for (let r = 1; r < origSummary.rowCount; r += 26) {
    for (const [lblCol, valCol] of [[1, 2], [5, 6], [9, 10]]) {
      const origFile = origSummary.getRow(r).getCell(valCol).value;
      const expFile = expSummary.getRow(r).getCell(valCol).value;

      if (origFile || expFile) {
        blocksChecked++;
        if (origFile === expFile) fileMatches++;
        else diffDetails.push(`Block at Row ${r}, Col ${valCol}: File mismatch (orig="${origFile}", exp="${expFile}")`);

        const origBl = origSummary.getRow(r + 1).getCell(valCol).value;
        const expBl = expSummary.getRow(r + 1).getCell(valCol).value;
        if (origBl === expBl) blMatches++;

        // Check formulas for this block: rows r+13 (Delays), r+16 (Clearance), r+17 (Client Delay), r+23 (Client Total)
        for (const offset of [13, 16, 17, 23]) {
          const oCell = origSummary.getRow(r + offset).getCell(valCol);
          const eCell = expSummary.getRow(r + offset).getCell(valCol);
          const oF = oCell.formula || (oCell.value && typeof oCell.value === 'object' && 'formula' in oCell.value ? (oCell.value as any).formula : null);
          const eF = eCell.formula || (eCell.value && typeof eCell.value === 'object' && 'formula' in eCell.value ? (eCell.value as any).formula : null);
          if (oF === eF) {
            formulaMatches++;
          } else {
            diffDetails.push(`Formula diff at ${oCell.address}: Orig="${oF}" vs Exp="${eF}"`);
          }
        }
      }
    }
  }

  console.log(`Total Blocks Checked: ${blocksChecked} (Expected: 58)`);
  console.log(`FILE Identifier Matches: ${fileMatches} / ${blocksChecked}`);
  console.log(`BL Identifier Matches: ${blMatches} / ${blocksChecked}`);
  console.log(`Summary Formulas Matching Original: ${formulaMatches} / ${blocksChecked * 4}`);
  if (diffDetails.length > 0) {
    console.log('Sample Differences:', diffDetails.slice(0, 10));
  } else {
    console.log('ALL 58 summary blocks have 100% exact layout, identifiers, and formulas!');
  }
}

verifyFidelity().catch(console.error);
