import ExcelJS from 'exceljs';
import path from 'path';

async function checkPendingVsSummary() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const pendingWs = wb.getWorksheet('Pending PO')!;
  const summaryWs = wb.getWorksheet(' REPORTS SUMMARY')!;

  // Map Pending PO by normalized CJ
  // CJ format in Pending PO: "CJ-2026-000091"
  // CJ format in REPORTS SUMMARY: "CJ-2026-000091-1X40FT- USANGU ZAMBIA"
  interface CJCharges {
    cj: string;
    bl: string;
    storage: number;
    cwr: number;
    other: number;
    charges: any[];
  }
  const pendingByCJ: Record<string, CJCharges> = {};

  pendingWs.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const sn = row.getCell(1).value;
    const rawCj = row.getCell(2).value?.toString()?.trim() || '';
    const rawBl = row.getCell(3).value?.toString()?.trim() || '';
    const cont = row.getCell(4).value?.toString()?.trim() || '';
    const details = row.getCell(5).value?.toString()?.trim() || '';
    const poNo = row.getCell(6).value?.toString()?.trim() || '';
    const totalCell = row.getCell(7);
    const comment = row.getCell(8).value?.toString()?.trim() || '';

    let totalVal = 0;
    if (totalCell.value && typeof totalCell.value === 'object' && 'result' in (totalCell.value as any)) {
      totalVal = Number((totalCell.value as any).result) || 0;
    } else if (typeof totalCell.value === 'number') {
      totalVal = totalCell.value;
    }

    // Extract core CJ: e.g. "CJ-2026-000091"
    const match = rawCj.match(/CJ-\d{4}-\d+/i);
    const cjKey = match ? match[0].toUpperCase() : rawCj.toUpperCase();

    if (!pendingByCJ[cjKey]) {
      pendingByCJ[cjKey] = { cj: rawCj, bl: rawBl, storage: 0, cwr: 0, other: 0, charges: [] };
    }
    const rec = pendingByCJ[cjKey];
    if (details.toLowerCase().includes('storage')) {
      rec.storage += totalVal;
    } else if (details.toLowerCase().includes('custom warehouse') || details.toLowerCase().includes('cwr')) {
      rec.cwr += totalVal;
    } else {
      rec.other += totalVal;
    }
    rec.charges.push({ sn, cj: rawCj, bl: rawBl, cont, details, poNo, totalVal, comment, formula: (totalCell.value as any)?.formula });
  });

  // Now scan REPORTS SUMMARY
  const summaryByCJ: Record<string, { rawFile: string, bl: string, storage: number, cwr: number, clientTotal: number }> = {};
  for (let r = 1; r < summaryWs.rowCount; r += 26) {
    const colPairs = [[1, 2], [5, 6], [9, 10]];
    for (const [lblCol, valCol] of colPairs) {
      const fileVal = summaryWs.getRow(r).getCell(valCol).value?.toString()?.trim() || '';
      if (fileVal) {
        const blVal = summaryWs.getRow(r + 1).getCell(valCol).value?.toString()?.trim() || '';
        const storageVal = Number(summaryWs.getRow(r + 18).getCell(valCol).value) || 0;
        const cwrVal = Number(summaryWs.getRow(r + 19).getCell(valCol).value) || 0;
        const clientTotalCell = summaryWs.getRow(r + 23).getCell(valCol).value;
        let clientTotalVal = 0;
        if (clientTotalCell && typeof clientTotalCell === 'object' && 'result' in (clientTotalCell as any)) {
          clientTotalVal = Number((clientTotalCell as any).result) || 0;
        } else if (typeof clientTotalCell === 'number') {
          clientTotalVal = clientTotalCell;
        }

        const match = fileVal.match(/CJ-\d{4}-\d+/i);
        const cjKey = match ? match[0].toUpperCase() : fileVal.toUpperCase();
        summaryByCJ[cjKey] = {
          rawFile: fileVal,
          bl: blVal,
          storage: storageVal,
          cwr: cwrVal,
          clientTotal: clientTotalVal
        };
      }
    }
  }

  console.log(`Pending distinct CJs: ${Object.keys(pendingByCJ).length}`);
  console.log(`Summary distinct CJs: ${Object.keys(summaryByCJ).length}`);

  let matchCount = 0;
  let exactStorageMatches = 0;
  let exactCwrMatches = 0;
  const discrepancies: any[] = [];

  for (const [cjKey, p] of Object.entries(pendingByCJ)) {
    const s = summaryByCJ[cjKey];
    if (s) {
      matchCount++;
      const storageDiff = Math.abs(p.storage - s.storage);
      const cwrDiff = Math.abs(p.cwr - s.cwr);
      if (storageDiff < 0.01) exactStorageMatches++;
      if (cwrDiff < 0.01) exactCwrMatches++;

      if (storageDiff >= 0.01 || cwrDiff >= 0.01) {
        discrepancies.push({
          cjKey,
          pending: { storage: p.storage, cwr: p.cwr, other: p.other, charges: p.charges.length },
          summary: { storage: s.storage, cwr: s.cwr, clientTotal: s.clientTotal },
          diff: { storageDiff, cwrDiff }
        });
      }
    } else {
      console.log(`CJ in Pending PO but NOT in summary: ${cjKey} (charges=${p.charges.length}, storage=${p.storage}, cwr=${p.cwr})`);
    }
  }

  console.log(`Matched CJs between Pending PO and Summary: ${matchCount}`);
  console.log(`Exact Storage Matches: ${exactStorageMatches}`);
  console.log(`Exact CWR Matches: ${exactCwrMatches}`);
  console.log(`Discrepancies count: ${discrepancies.length}`);
  if (discrepancies.length > 0) {
    console.log(`Sample discrepancies:`, JSON.stringify(discrepancies.slice(0, 5), null, 2));
  }
}

checkPendingVsSummary().catch(console.error);
