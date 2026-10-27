import ExcelJS from 'exceljs';
import path from 'path';

async function auditRows() {
  const originalPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(originalPath);

  console.log('=== ROW-BY-ROW AUDIT OF ORIGINAL WORKBOOK ===');

  // 1. Pending PO
  const pendingWs = wb.getWorksheet('Pending PO')!;
  let pendingDataRows = 0;
  let pendingBlankRows = 0;
  let pendingSubtotalRows = 0;
  let pendingHeaderRows = 0;
  const pendingRowsDetail: any[] = [];

  pendingWs.eachRow({ includeEmpty: true }, (row, r) => {
    const c1 = row.getCell(1).value;
    const c2 = row.getCell(2).value;
    const c5 = row.getCell(5).value;
    const c7 = row.getCell(7).value;
    if (r === 1) {
      pendingHeaderRows++;
      return;
    }
    if (r === 2) {
      pendingHeaderRows++;
      return;
    }
    if (r === 98) {
      pendingSubtotalRows++;
      return;
    }
    if (!c2 && !c5 && !c7) {
      pendingBlankRows++;
      return;
    }
    pendingDataRows++;
    pendingRowsDetail.push({
      r,
      sn: c1,
      cj: c2,
      bl: row.getCell(3).value,
      cont: row.getCell(4).value,
      details: c5,
      po: row.getCell(6).value,
      total: typeof c7 === 'object' && c7 !== null && 'result' in (c7 as any) ? (c7 as any).result : c7
    });
  });

  console.log(`Pending PO: total rows in sheet=${pendingWs.rowCount}, actualRows=${pendingWs.actualRowCount}`);
  console.log(`  Headers: ${pendingHeaderRows} (R1 title, R2 headers)`);
  console.log(`  Subtotal: ${pendingSubtotalRows} (R98: =SUM(G3:G97))`);
  console.log(`  Data Rows: ${pendingDataRows} (R3 through R97)`);
  console.log(`  Blank Rows: ${pendingBlankRows}`);

  // 2. Billed
  const billedWs = wb.getWorksheet('Billed')!;
  let billedDataRows = 0;
  let billedHeaderRows = 0;
  let billedSubtotalRows = 0;
  let billedBlankRows = 0;

  billedWs.eachRow({ includeEmpty: true }, (row, r) => {
    const c2 = row.getCell(2).value;
    const c7 = row.getCell(7).value;
    if (r <= 2) {
      billedHeaderRows++;
      return;
    }
    if (r === 26) {
      billedSubtotalRows++;
      return;
    }
    if (!c2) {
      billedBlankRows++;
      return;
    }
    billedDataRows++;
  });
  console.log(`Billed: total rows=${billedWs.rowCount}, actualRows=${billedWs.actualRowCount}`);
  console.log(`  Headers: ${billedHeaderRows}`);
  console.log(`  Subtotal: ${billedSubtotalRows} (R26: =SUM(G3:G25))`);
  console.log(`  Data Rows: ${billedDataRows} (R3 through R25 = 23 rows)`);
  console.log(`  Blank / empty Rows: ${billedBlankRows} (R27, R28)`);

  // 3. QUERIED
  const queriedWs = wb.getWorksheet('QUERIED')!;
  let queriedDataRows = 0;
  let queriedHeaderRows = 0;
  let queriedBlankRows = 0;

  queriedWs.eachRow({ includeEmpty: true }, (row, r) => {
    const c2 = row.getCell(2).value;
    if (r <= 2) {
      queriedHeaderRows++;
      return;
    }
    if (!c2) {
      queriedBlankRows++;
      return;
    }
    queriedDataRows++;
  });
  console.log(`QUERIED: total rows=${queriedWs.rowCount}, actualRows=${queriedWs.actualRowCount}`);
  console.log(`  Headers: ${queriedHeaderRows}`);
  console.log(`  Data Rows: ${queriedDataRows} (R3 through R8 = 6 rows)`);
  console.log(`  Blank Rows: ${queriedBlankRows}`);

  // 4. Report
  const reportWs = wb.getWorksheet('Report')!;
  let reportDataRows = 0;
  let reportHeaderRows = 0;
  let reportBlankRows = 0;

  reportWs.eachRow({ includeEmpty: true }, (row, r) => {
    const c1 = row.getCell(1).value;
    if (r === 1) {
      reportHeaderRows++;
      return;
    }
    if (!c1) {
      reportBlankRows++;
      return;
    }
    reportDataRows++;
  });
  console.log(`Report: total rows=${reportWs.rowCount}, actualRows=${reportWs.actualRowCount}`);
  console.log(`  Headers: ${reportHeaderRows} (R1 headers)`);
  console.log(`  Data Rows: ${reportDataRows} (R2 through R108 = 107 records)`);
  console.log(`  Blank Rows: ${reportBlankRows} (R109)`);

  console.log('\n--- TOTAL CHARGES SUMMARY ---');
  console.log(`Pending PO Data Rows: ${pendingDataRows}`);
  console.log(`Billed Data Rows: ${billedDataRows}`);
  console.log(`QUERIED Data Rows: ${queriedDataRows}`);
  console.log(`Total Operational Charges: ${pendingDataRows + billedDataRows + queriedDataRows}`);
}

auditRows().catch(console.error);
