import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function audit() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  console.log(`Inspecting ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log(`Total worksheets: ${wb.worksheets.length}`);
  const sheetsInfo = wb.worksheets.map((ws, idx) => ({
    index: idx,
    id: ws.id,
    name: ws.name,
    actualRowCount: ws.actualRowCount,
    rowCount: ws.rowCount,
    actualColumnCount: ws.actualColumnCount,
    columnCount: ws.columnCount,
    state: ws.state,
    views: ws.views
  }));
  console.log(JSON.stringify(sheetsInfo, null, 2));

  for (const ws of wb.worksheets) {
    console.log(`\n========================================`);
    console.log(`Sheet [${ws.name}] (index: ${ws.id})`);
    console.log(`Dimensions: rows=${ws.rowCount}, actualRows=${ws.actualRowCount}, cols=${ws.columnCount}, actualCols=${ws.actualColumnCount}`);

    // Print headers (Row 1, 2)
    const row1: any[] = [];
    const row2: any[] = [];
    const row3: any[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
      row1.push(`Col ${col} (${c.address}): ${JSON.stringify(c.value)}`);
    });
    ws.getRow(2).eachCell({ includeEmpty: true }, (c, col) => {
      row2.push(`Col ${col} (${c.address}): ${JSON.stringify(c.value)}`);
    });
    ws.getRow(3).eachCell({ includeEmpty: true }, (c, col) => {
      row3.push(`Col ${col} (${c.address}): ${JSON.stringify(c.value)}`);
    });
    console.log(`Row 1:\n  ${row1.slice(0, 15).join('\n  ')}`);
    if (ws.actualRowCount >= 2) console.log(`Row 2:\n  ${row2.slice(0, 15).join('\n  ')}`);

    // Find all formula cells
    let formulaCount = 0;
    const formulasSample: any[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        if (cell.formula || (cell.value && typeof cell.value === 'object' && 'formula' in cell.value)) {
          formulaCount++;
          if (formulasSample.length < 15) {
            formulasSample.push({
              address: cell.address,
              row: rowNum,
              col: colNum,
              formula: (cell.value as any)?.formula || cell.formula,
              result: (cell.value as any)?.result,
              numFmt: cell.numFmt
            });
          }
        }
      });
    });
    console.log(`Formula cells count in [${ws.name}]: ${formulaCount}`);
    if (formulasSample.length > 0) {
      console.log(`Sample formulas in [${ws.name}]:`, JSON.stringify(formulasSample, null, 2));
    }

    // Merged cells
    const merges = (ws as any)._merges ? Object.keys((ws as any)._merges) : [];
    console.log(`Merged cells count in [${ws.name}]: ${merges.length}`);
    if (merges.length > 0) {
      console.log(`Sample merges:`, merges.slice(0, 10));
    }
  }
}

audit().catch(console.error);
