import ExcelJS from 'exceljs';
import path from 'path';

async function auditBilledAndQueried() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const billedWs = wb.getWorksheet('Billed')!;
  const queriedWs = wb.getWorksheet('QUERIED')!;

  console.log('--- BILLED SHEET ROWS ---');
  billedWs.eachRow((row, r) => {
    if (r <= 2) return;
    console.log(`Billed R${r}: S/N=${row.getCell(1).value}, CJ=${row.getCell(2).value}, BL=${row.getCell(3).value}, Details=${row.getCell(5).value}, PO=${row.getCell(6).value}, Total=${JSON.stringify(row.getCell(7).value)}`);
  });

  console.log('\n--- QUERIED SHEET ROWS ---');
  queriedWs.eachRow((row, r) => {
    if (r <= 2) return;
    console.log(`Queried R${r}: S/N=${row.getCell(1).value}, CJ=${row.getCell(2).value}, BL=${row.getCell(3).value}, Details=${row.getCell(5).value}, PO=${row.getCell(6).value}, Total=${JSON.stringify(row.getCell(7).value)}, Comment=${row.getCell(8).value}`);
  });
}

auditBilledAndQueried().catch(console.error);
