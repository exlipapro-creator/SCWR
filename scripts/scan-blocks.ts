import ExcelJS from 'exceljs';
import path from 'path';

async function scanAllBlocks() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet(' REPORTS SUMMARY')!;

  const blocks: any[] = [];
  // Each block starts at row 1, 27, 53, 79, ... (step 26)
  // Columns: A/B (col 1/2), E/F (col 5/6), I/J (col 9/10)
  for (let r = 1; r < ws.rowCount; r += 26) {
    const colPairs = [[1, 2], [5, 6], [9, 10]];
    for (const [lblCol, valCol] of colPairs) {
      const fileVal = ws.getRow(r).getCell(valCol).value;
      if (fileVal) {
        const blVal = ws.getRow(r + 1).getCell(valCol).value;
        const storageVal = ws.getRow(r + 18).getCell(valCol).value;
        const cwrVal = ws.getRow(r + 19).getCell(valCol).value;
        const clientTotalVal = ws.getRow(r + 23).getCell(valCol).value;
        blocks.push({
          startRow: r,
          valCol,
          file: fileVal,
          bl: blVal,
          storage: storageVal,
          cwr: cwrVal,
          clientTotal: clientTotalVal
        });
      }
    }
  }

  console.log(`Total blocks in REPORTS SUMMARY: ${blocks.length}`);
  console.log(`First 5 blocks:`, JSON.stringify(blocks.slice(0, 5), null, 2));
  console.log(`Last 5 blocks:`, JSON.stringify(blocks.slice(-5), null, 2));
}

scanAllBlocks().catch(console.error);
