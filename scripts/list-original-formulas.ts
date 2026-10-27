import ExcelJS from 'exceljs';
import path from 'path';

async function listAllOriginalFormulas() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');

  console.log('=== EXACT BREAKDOWN OF ALL 362 FORMULAS IN ORIGINAL WORKBOOK ===');
  let grandTotal = 0;

  for (const ws of wb.worksheets) {
    const list: { addr: string; formula: string; result: any }[] = [];
    ws.eachRow((row) => {
      row.eachCell((cell) => {
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
          list.push({ addr: cell.address, formula: f, result: r });
        }
      });
    });
    console.log(`Sheet "${ws.name}": ${list.length} formulas`);
    grandTotal += list.length;
    if (ws.name === ' REPORTS SUMMARY') {
      // Check row 24 formula vs constant across all 58 blocks
      let row24Formulas = 0;
      let row24Constants = 0;
      for (let r = 1; r < ws.rowCount; r += 26) {
        for (const col of [2, 6, 10]) {
          const fileVal = ws.getRow(r).getCell(col).value;
          if (fileVal) {
            const clientTotalCell = ws.getRow(r + 23).getCell(col);
            const isF = !!(clientTotalCell.formula || (clientTotalCell.value && typeof clientTotalCell.value === 'object' && 'formula' in clientTotalCell.value));
            if (isF) row24Formulas++;
            else {
              row24Constants++;
              console.log(`  Row 24 constant in block at row ${r}, col ${col} (${clientTotalCell.address}): value=${JSON.stringify(clientTotalCell.value)}`);
            }
          }
        }
      }
      console.log(`  REPORTS SUMMARY Client Total cells: ${row24Formulas} formulas, ${row24Constants} constants (Total 58 blocks)`);
    }
  }

  console.log(`\nGrand Total Formulas in Original Workbook: ${grandTotal}`);
}

listAllOriginalFormulas().catch(console.error);
