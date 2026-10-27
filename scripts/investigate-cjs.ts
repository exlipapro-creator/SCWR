import ExcelJS from 'exceljs';
import path from 'path';

async function investigateCJs() {
  const originalPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(originalPath);

  const targets = ['000182', '000170', '000209'];

  for (const ws of wb.worksheets) {
    console.log(`\n================ SHEET: ${ws.name} ================`);
    ws.eachRow((row, r) => {
      row.eachCell((cell, c) => {
        const valStr = String(cell.value || '');
        for (const t of targets) {
          if (valStr.includes(t)) {
            console.log(`Target ${t} found in [${ws.name}] at ${cell.address} (Row ${r}, Col ${c}):`);
            const rowValues: any[] = [];
            row.eachCell((cCell, colIdx) => {
              let v = cCell.value;
              if (typeof v === 'object' && v !== null && 'result' in (v as any)) {
                v = `[formula: ${(v as any).formula} -> ${(v as any).result}]`;
              }
              rowValues.push(`C${colIdx}: ${JSON.stringify(v)}`);
            });
            console.log(`  Row ${r} values: ${rowValues.join(' | ')}`);
          }
        }
      });
    });
  }
}

investigateCJs().catch(console.error);
