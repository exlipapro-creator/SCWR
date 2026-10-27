import ExcelJS from 'exceljs';
import path from 'path';

async function inspectSummary() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.getWorksheet(' REPORTS SUMMARY');
  if (!ws) {
    console.log('REPORTS SUMMARY not found');
    return;
  }
  console.log(`REPORTS SUMMARY: actualRowCount=${ws.actualRowCount}, actualColumnCount=${ws.actualColumnCount}`);

  // Inspect the first 50 rows of REPORTS SUMMARY
  for (let r = 1; r <= 30; r++) {
    const row = ws.getRow(r);
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (c, col) => {
      if (col <= 12) {
        let val = c.value;
        if (val && typeof val === 'object') {
          if ('formula' in val) val = `[F: ${(val as any).formula} -> ${(val as any).result}]`;
        }
        if (val !== null && val !== undefined && val !== '') {
          cells.push(`C${col}(${c.address}):${JSON.stringify(val)}`);
        }
      }
    });
    if (cells.length > 0) {
      console.log(`Row ${r}: ${cells.join(' | ')}`);
    }
  }
}

inspectSummary().catch(console.error);
