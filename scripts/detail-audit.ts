import ExcelJS from 'exceljs';
import path from 'path';

async function detailAudit() {
  const filePath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  for (const sheetName of ['Pending PO', 'Billed', 'Report', 'QUERIED']) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) {
      console.log(`Missing sheet: ${sheetName}`);
      continue;
    }
    console.log(`\n=================== SHEET: ${sheetName} ===================`);
    console.log(`rowCount: ${ws.rowCount}, actualRowCount: ${ws.actualRowCount}, colCount: ${ws.columnCount}`);
    
    // First 3 rows
    for (let r = 1; r <= Math.min(3, ws.actualRowCount); r++) {
      const row = ws.getRow(r);
      const vals: any[] = [];
      row.eachCell({ includeEmpty: true }, (c, col) => {
        let v = c.value;
        if (v && typeof v === 'object') {
          if ('formula' in v) v = `[FORMULA: ${(v as any).formula} -> ${(v as any).result}]`;
          else if ('richText' in v) v = (v as any).richText.map((t: any) => t.text).join('');
        }
        vals.push(`C${col}:${JSON.stringify(v)}`);
      });
      console.log(`Row ${r}:`, vals.join(' | '));
    }

    // Check unique charge descriptions / types in Pending PO
    if (sheetName === 'Pending PO') {
      const detailsMap: Record<string, number> = {};
      const cjList = new Set<string>();
      let formulaCount = 0;
      let totalSum = 0;
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const cj = row.getCell(2).value?.toString()?.trim() || '';
        const details = row.getCell(5).value?.toString()?.trim() || '';
        const totalCell = row.getCell(7);
        let totalVal = 0;
        if (typeof totalCell.value === 'object' && totalCell.value !== null && 'result' in (totalCell.value as any)) {
          formulaCount++;
          totalVal = Number((totalCell.value as any).result) || 0;
        } else if (typeof totalCell.value === 'number') {
          totalVal = totalCell.value;
        }
        totalSum += totalVal;
        if (cj) cjList.add(cj);
        if (details) detailsMap[details] = (detailsMap[details] || 0) + 1;
      });
      console.log(`Pending PO distinct CJs: ${cjList.size}`);
      console.log(`Pending PO formula rows: ${formulaCount}`);
      console.log(`Pending PO sum of totals: ${totalSum}`);
      console.log(`Pending PO unique Details/descriptions:`, JSON.stringify(detailsMap, null, 2));
    }

    if (sheetName === 'Report') {
      const headers: string[] = [];
      ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => {
        headers.push(`${col}: ${c.value}`);
      });
      console.log(`Report headers (${headers.length}):`, headers);
    }
  }
}

detailAudit().catch(console.error);
