import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('  ✓ ' + message);
}

function hashFile(p: string): string {
  if (!fs.existsSync(p)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

async function runStrictFormulaParityTest() {
  console.log('================================================================');
  console.log('STRICT FORMULA PARITY REGRESSION TEST (ALL 362 COORDINATES)');
  console.log('================================================================\n');

  const MASTER_DB_PATH = path.resolve('data/cwr_storage_master.sqlite');
  const masterHashBefore = hashFile(MASTER_DB_PATH);

  const ISOLATED_DB_PATH = path.resolve('data/test_formula_parity_isolated.sqlite');
  [ISOLATED_DB_PATH, ISOLATED_DB_PATH + '-wal', ISOLATED_DB_PATH + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  process.env.DATABASE_PATH = ISOLATED_DB_PATH;

  // Dynamic imports for database isolation
  const { db, initDatabase, DB_PATH } = await import('../server/db.ts');
  const { IngestionService } = await import('../server/ingestion-service.ts');
  const { ExportService } = await import('../server/export-service.ts');

  assert(DB_PATH === ISOLATED_DB_PATH, 'Test routed to isolated test database: ' + path.basename(DB_PATH));
  initDatabase();

  const origPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  assert(fs.existsSync(origPath), 'Original workbook exists at ' + origPath);

  // Ingest into isolated database
  console.log('Ingesting reference workbook into isolated test database...');
  await IngestionService.importWorkbook(origPath, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');

  // Generate fresh export from isolated state
  console.log('Generating export from isolated state...');
  const exportResult = await ExportService.generateExportWorkbook();
  const expPath = exportResult.outputPath;
  assert(fs.existsSync(expPath), 'Exported workbook exists at ' + expPath);

  const origWb = new ExcelJS.Workbook();
  await origWb.xlsx.readFile(origPath);

  const expWb = new ExcelJS.Workbook();
  await expWb.xlsx.readFile(expPath);

  // 1. Verify sheet names and order including exact leading space
  const origSheetNames = origWb.worksheets.map(ws => ws.name);
  const expSheetNames = expWb.worksheets.map(ws => ws.name);
  assert(expSheetNames.includes(' REPORTS SUMMARY'), 'Export strictly preserves exact leading space in " REPORTS SUMMARY"');
  assert(JSON.stringify(origSheetNames) === JSON.stringify(expSheetNames), 'Worksheet names and order match identically: ' + JSON.stringify(origSheetNames));

  // 2. Expected formula counts per worksheet
  const expectedCounts: Record<string, number> = {
    'Pending PO': 77,
    'Billed': 20,
    'Report': 0,
    'QUERIED': 5,
    ' REPORTS SUMMARY': 231,
    'Sheet2': 4,
    'Sheet1': 25
  };

  const actualOrigCounts: Record<string, number> = {};
  const actualExpCounts: Record<string, number> = {};

  const allOrigFormulas = new Map<string, { sheet: string; address: string; formula: string; result: any }>();
  const allExpFormulas = new Map<string, { sheet: string; address: string; formula: string; result: any }>();

  for (const ws of origWb.worksheets) {
    let count = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        let f = cell.formula;
        let r = cell.result;
        if (!f && cell.value && typeof cell.value === 'object' && 'formula' in (cell.value as any)) {
          f = (cell.value as any).formula;
          r = (cell.value as any).result;
        }
        if (f) {
          count++;
          allOrigFormulas.set(ws.name + '!' + cell.address, { sheet: ws.name, address: cell.address, formula: f.trim(), result: r });
        }
      });
    });
    actualOrigCounts[ws.name] = count;
  }

  for (const ws of expWb.worksheets) {
    let count = 0;
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        let f = cell.formula;
        let r = cell.result;
        if (!f && cell.value && typeof cell.value === 'object' && 'formula' in (cell.value as any)) {
          f = (cell.value as any).formula;
          r = (cell.value as any).result;
        }
        if (f) {
          count++;
          allExpFormulas.set(ws.name + '!' + cell.address, { sheet: ws.name, address: cell.address, formula: f.trim(), result: r });
        }
      });
    });
    actualExpCounts[ws.name] = count;
  }

  console.log('\nChecking sheet-by-sheet formula counts:');
  let totalOrig = 0;
  let totalExp = 0;
  for (const [sheet, expCount] of Object.entries(expectedCounts)) {
    assert(actualOrigCounts[sheet] === expCount, 'Original sheet "' + sheet + '" has exactly ' + expCount + ' formulas (found: ' + actualOrigCounts[sheet] + ')');
    assert(actualExpCounts[sheet] === expCount, 'Exported sheet "' + sheet + '" has exactly ' + expCount + ' formulas (found: ' + actualExpCounts[sheet] + ')');
    totalOrig += actualOrigCounts[sheet];
    totalExp += actualExpCounts[sheet];
  }

  assert(totalOrig === 362, 'Total formulas in original workbook is exactly 362 (found: ' + totalOrig + ')');
  assert(totalExp === 362, 'Total formulas in exported workbook is exactly 362 (found: ' + totalExp + ')');

  console.log('\nChecking coordinate-by-coordinate parity across all 362 original formula cells:');
  let matchedCoordinates = 0;
  for (const [key, origItem] of allOrigFormulas.entries()) {
    const expItem = allExpFormulas.get(key);
    assert(!!expItem, 'Export contains formula cell at coordinate ' + key);
    assert(origItem.formula === expItem!.formula, 'Formula string at ' + key + ' matches exactly: "' + origItem.formula + '" vs "' + expItem!.formula + '"');
    matchedCoordinates++;
  }
  assert(matchedCoordinates === 362, 'All 362 formula coordinates verified identically (verified: ' + matchedCoordinates + ')');

  console.log('\nChecking that no extraneous formulas were added in export:');
  for (const [key, expItem] of allExpFormulas.entries()) {
    assert(allOrigFormulas.has(key), 'Exported formula at ' + key + ' is present in original workbook (no phantom formula)');
  }

  console.log('\nChecking specific critical edge cases:');
  // J50 in ' REPORTS SUMMARY' must be constant 220, NOT a formula
  const repSummaryWs = expWb.getWorksheet(' REPORTS SUMMARY')!;
  const j50Cell = repSummaryWs.getCell('J50');
  const j50Formula = j50Cell.formula || (typeof j50Cell.value === 'object' && (j50Cell.value as any)?.formula);
  assert(!j50Formula, ' REPORTS SUMMARY!J50 is a numeric constant, NOT converted to a formula');
  assert(Number(j50Cell.value) === 220, ' REPORTS SUMMARY!J50 has numeric constant value 220 (found: ' + j50Cell.value + ')');

  // Check J196, B222, F222 exact formula strings
  assert(repSummaryWs.getCell('J196').formula === 'J195-J194', 'J196 formula preserved as J195-J194');
  assert(repSummaryWs.getCell('B222').formula === 'B221-B220', 'B222 formula preserved as B221-B220');
  assert(repSummaryWs.getCell('F222').formula === 'F221-F220', 'F222 formula preserved as F221-F220');

  // Verify master production DB was 100% untouched
  const masterHashAfter = hashFile(MASTER_DB_PATH);
  assert(masterHashBefore === masterHashAfter, 'Master production database remained 100% untouched and byte-identical (SHA-256: ' + masterHashBefore.slice(0, 16) + '...)');

  // Clean up isolated database
  db.close();
  [ISOLATED_DB_PATH, ISOLATED_DB_PATH + '-wal', ISOLATED_DB_PATH + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  console.log('\n================================================================');
  console.log('STRICT FORMULA PARITY REGRESSION TEST: 100% PASSED (362/362)');
  console.log('================================================================\n');
}

runStrictFormulaParityTest().catch((err) => {
  console.error('Fatal error during strict formula parity test:', err);
  process.exit(1);
});
