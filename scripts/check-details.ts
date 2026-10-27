import ExcelJS from 'exceljs';
import path from 'path';

async function checkDetails() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const pendingWs = wb.getWorksheet('Pending PO')!;
  pendingWs.eachRow((row, rowNum) => {
    const rawCj = row.getCell(2).value?.toString() || '';
    if (rawCj.includes('182') || rawCj.includes('170') || rawCj.includes('209') || row.getCell(1).value === null) {
      console.log(`Row ${rowNum}:`, {
        sn: row.getCell(1).value,
        cj: row.getCell(2).value,
        bl: row.getCell(3).value,
        cont: row.getCell(4).value,
        details: row.getCell(5).value,
        po: row.getCell(6).value,
        total: row.getCell(7).value,
        comment: row.getCell(8).value
      });
    }
  });
}

checkDetails().catch(console.error);
