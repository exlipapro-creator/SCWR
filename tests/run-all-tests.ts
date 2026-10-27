import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

function hashFile(p: string): string {
  if (!fs.existsSync(p)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING AUTHORITATIVE AUTOMATED TEST SUITE (STRICT ISOLATION)');
  console.log('========================================================\n');

  // Rule 1 & Rule 2: Strict Test Isolation Setup
  const MASTER_DB_PATH = path.resolve('data/cwr_storage_master.sqlite');
  const masterHashBefore = hashFile(MASTER_DB_PATH);

  const ISOLATED_DB_PATH = path.resolve('data/test_cwr_isolated.sqlite');
  [ISOLATED_DB_PATH, ISOLATED_DB_PATH + '-wal', ISOLATED_DB_PATH + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  process.env.DATABASE_PATH = ISOLATED_DB_PATH;

  // Dynamic imports to ensure DATABASE_PATH takes effect
  const { CalculationEngine } = await import('../server/calculation-engine.ts');
  const { IngestionService } = await import('../server/ingestion-service.ts');
  const { ExportService } = await import('../server/export-service.ts');
  const { db, initDatabase, DB_PATH } = await import('../server/db.ts');

  assert(DB_PATH === ISOLATED_DB_PATH, `Test suite routed to isolated test database: ${path.basename(DB_PATH)}`);

  // 1. Central Calculation Engine Unit Tests
  console.log('\nSuite 1: Central Calculation Engine Unit Tests');
  assert(CalculationEngine.normalizeCJ('CJ-2026-000091-1X40FT- USANGU ZAMBIA') === 'CJ-2026-000091', 'Normalizes composite CJ string to canonical ID');
  assert(CalculationEngine.normalizeCJ('cj-2026-000155') === 'CJ-2026-000155', 'Normalizes lowercase CJ to uppercase');
  assert(CalculationEngine.normalizeBL(' KMTCTAO 8505575 ') === 'KMTCTAO8505575', 'Normalizes BL removing inner and outer whitespace');

  // Classification tests
  assert(CalculationEngine.classifyCharge('Storage Charges') === 'STORAGE', 'Classifies "Storage Charges" as STORAGE');
  assert(CalculationEngine.classifyCharge('Custom Warehouse Rent') === 'CWR', 'Classifies "Custom Warehouse Rent" as CWR');
  assert(CalculationEngine.classifyCharge('Power and Monitoring') === 'REEFER_MONITORING', 'Classifies "Power and Monitoring" as REEFER_MONITORING');
  assert(CalculationEngine.classifyCharge('Lift On/Off') === 'LIFT', 'Classifies "Lift On/Off" as LIFT');
  assert(CalculationEngine.classifyCharge('Haulage transport to ICD') === 'TRANSPORT', 'Classifies transport keywords as TRANSPORT');

  // Formula evaluation tests
  assert(CalculationEngine.evaluateArithmeticFormula('150+120') === 270, 'Evaluates addition formula "150+120" -> 270');
  assert(Math.abs(CalculationEngine.evaluateArithmeticFormula('(69954+216220)/2600') - 110.0669) < 0.001, 'Evaluates currency conversion formula "(69954+216220)/2600"');
  assert(CalculationEngine.evaluateArithmeticFormula('invalid syntax') === 0, 'Safe fallback for malformed formula');

  // Date and duration tests
  assert(CalculationEngine.diffDays('2026-07-13', '2026-07-22') === 9, 'Calculates 9 calendar days between 2026-07-13 and 2026-07-22');
  assert(CalculationEngine.diffDays('2026-07-08', '2026-06-27') === -11, 'Preserves legitimate negative client delay (-11 days)');
  assert(CalculationEngine.diffDays(null, '2026-07-22') === null, 'Missing date input returns null, never 0');

  // Combined 24-field metric calculation
  const testMetrics = CalculationEngine.computeShipmentMetrics({
    allocationRequestDate: '2026-07-13',
    allocationDate: '2026-07-22',
    docsReceivedDate: '2026-06-27',
    dischargeDate: '2026-07-08',
    doDate: '2026-07-16',
    storageCharges: 270,
    cwrCharges: 0,
    reeferCharges: 0
  });

  assert(testMetrics.delaysInAllocation === 9, 'delaysInAllocation matches reference workbook (9 days)');
  assert(testMetrics.clearance === 8, 'clearance matches reference workbook (8 days)');
  assert(testMetrics.clientDelay === -11, 'clientDelay matches reference workbook (-11 days)');
  assert(testMetrics.clientTotal === 270, 'clientTotal equals storage amount when CWR is 0');

  // 2. Ingestion & Reconciliation Integration Tests
  console.log('\nSuite 2: Workbook Ingestion & Master DB Reconciliation');
  initDatabase();
  const workbookPath = path.resolve('data/Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  assert(fs.existsSync(workbookPath), 'Reference workbook file exists on filesystem');

  const preview = await IngestionService.previewWorkbook(workbookPath, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  assert(preview.missingRequiredSheets.length === 0, 'All required sheets detected during pre-import validation');
  assert(preview.pendingPORowsCount === 95, 'Detected exactly 95 Pending PO charge line items');
  assert(preview.distinctCJsCount === 60, 'Detected 60 distinct non-empty CJs in Pending PO');
  assert(preview.summaryBlocksCount === 58, 'Detected 58 executive summary blocks in " REPORTS SUMMARY"');

  const importResult = await IngestionService.importWorkbook(workbookPath, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  assert(!!importResult.batchId, 'Import committed transactionally with generated batch ID');

  // Verify charge entries count in isolated DB (95 Pending PO + 23 Billed + 6 Queried = 124 total charges)
  const chargesInDb = (db.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
  assert(chargesInDb === 124, `Isolated database contains exactly 124 charge entries across Pending PO, Billed, and QUERIED (found: ${chargesInDb})`);

  // Verify Status Tracking: Check Billed & Queried matching
  const billedInDb = (db.prepare("SELECT COUNT(*) as cnt FROM charge_entries WHERE processing_status = 'BILLED'").get() as any).cnt;
  const queriedInDb = (db.prepare("SELECT COUNT(*) as cnt FROM charge_entries WHERE processing_status = 'QUERIED'").get() as any).cnt;
  const pendingInDb = (db.prepare("SELECT COUNT(*) as cnt FROM charge_entries WHERE processing_status = 'PENDING'").get() as any).cnt;

  assert(billedInDb === 23, `Evidence from Billed sheet imported at charge-entry level (billed charges: ${billedInDb})`);
  assert(queriedInDb === 6, `Evidence from QUERIED sheet imported at charge-entry level (queried charges: ${queriedInDb})`);
  assert(pendingInDb === 95, `Pending PO charges accurately initialized to PENDING status (pending charges: ${pendingInDb})`);

  // Multi-charge CJ test: verify CJ-2026-000134 has distinct charge statuses
  const chgs134 = db.prepare("SELECT details, amount, processing_status, query_reason FROM charge_entries WHERE normalized_cj = 'CJ-2026-000134'").all() as any[];
  assert(chgs134.length >= 2, 'CJ-2026-000134 retains multiple distinct charge line items');
  const hasQueried134 = chgs134.some(c => c.processing_status === 'QUERIED');
  assert(hasQueried134, 'CJ-2026-000134 reflects queried status on disputed lines with comments preserved');

  // Financial reconciliation check on reference CJ-2026-000091
  const cj91Details = db.prepare("SELECT * FROM shipment_details_24 WHERE shipment_id = 'CJ-2026-000091'").get() as any;
  assert(cj91Details !== undefined, 'Shipment details exist for reference CJ-2026-000091');
  assert(cj91Details.storage_amount === 270, 'Storage total for CJ-2026-000091 reconciles to exactly $270.00');
  assert(cj91Details.delays_in_allocation === 9, 'Allocation delay for CJ-2026-000091 reconciles to 9 days');
  assert(cj91Details.clearance === 8, 'Clearance for CJ-2026-000091 reconciles to 8 days');

  // 3. Excel Export & Round-Trip Preservation Tests
  console.log('\nSuite 3: Excel Export & Round-Trip Preservation Tests');
  const exportResult = await ExportService.generateExportWorkbook();
  assert(fs.existsSync(exportResult.outputPath), 'Exported .xlsx file generated successfully');
  assert(exportResult.report.validationPassed, 'Export post-generation round-trip validation passed');
  assert(exportResult.report.preservedFormulasCount === 362, `Preserved exactly 362 formula cells in export matching original workbook (found: ${exportResult.report.preservedFormulasCount})`);
  assert(exportResult.report.sheetNames.includes(' REPORTS SUMMARY'), 'Export strictly preserves " REPORTS SUMMARY" with leading space');
  assert(exportResult.report.reconciledSummaryBlocks === 58, 'All 58 executive blocks reconciled against master database');

  // 4. Duplicate Re-Import Test
  console.log('\nSuite 4: Idempotency & Duplicate Re-Import Protection');
  await IngestionService.importWorkbook(workbookPath, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');
  const chargesAfterReimport = (db.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
  assert(chargesAfterReimport === 124, `Re-importing unchanged workbook did NOT create duplicate charge entries (remained 124)`);

  // 5. Verification Protection Test: Manual verified data is protected from re-import overwrite
  console.log('\nSuite 5: Verification Protection & Non-Destructive Ingestion (In Isolation)');
  const testChargeId = 'CHG-CJ-2026-000091-STORAGE-1';
  db.prepare(`
    UPDATE charge_entries SET
      processing_status = 'RESOLVED',
      po_no = 'VERIFIED-PO-777',
      is_verified = 1
    WHERE id = ?
  `).run(testChargeId);

  db.prepare(`
    UPDATE shipment_details_24 SET
      truck_number = 'VERIFIED-TRUCK-X',
      is_verified = 1
    WHERE shipment_id = 'CJ-2026-000091'
  `).run();

  // Perform re-import on isolated DB
  await IngestionService.importWorkbook(workbookPath, 'Storage_and_CWR_Charges_SEPT_2026_.xlsx');

  const verifiedCharge = db.prepare('SELECT processing_status, po_no FROM charge_entries WHERE id = ?').get(testChargeId) as any;
  assert(verifiedCharge.processing_status === 'RESOLVED', 'Manually verified charge status (RESOLVED) NOT overwritten by re-import');
  assert(verifiedCharge.po_no === 'VERIFIED-PO-777', 'Manually verified PO number NOT overwritten by re-import');

  const verifiedShipment = db.prepare('SELECT truck_number FROM shipment_details_24 WHERE shipment_id = ?').get('CJ-2026-000091') as any;
  assert(verifiedShipment.truck_number === 'VERIFIED-TRUCK-X', 'Manually verified shipment field NOT overwritten by re-import');

  // 6. Transaction Rollback & Failure Safety
  console.log('\nSuite 6: Transaction Atomicity & Failure Rollback');
  const countBefore = (db.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
  let rollbackSuccess = false;
  try {
    const failingTx = db.transaction(() => {
      db.prepare(`INSERT INTO charge_entries (id, sn, cj, normalized_cj, details, classification, amount, processing_status, is_verified, created_at, updated_at) VALUES ('FAIL-CHG', 9999, 'CJ-FAIL', 'CJ-FAIL', 'Fail', 'STORAGE', 100, 'PENDING', 0, datetime('now'), datetime('now'))`).run();
      // Simulate fatal failure
      throw new Error('SIMULATED_INGESTION_ERROR');
    });
    failingTx();
  } catch (err: any) {
    if (err.message === 'SIMULATED_INGESTION_ERROR') {
      const countAfter = (db.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
      rollbackSuccess = (countBefore === countAfter);
    }
  }
  assert(rollbackSuccess, 'Transactional rollback strictly prevents partial/corrupt database writes on failure');

  // 7. Master Production Database Protection Verification
  console.log('\nSuite 7: Master Production Database Immutability Verification');
  const masterHashAfter = hashFile(MASTER_DB_PATH);
  assert(masterHashBefore === masterHashAfter, 'Master production database remained 100% untouched and byte-identical throughout entire test suite execution');

  // Cleanup isolated test database
  db.close();
  [ISOLATED_DB_PATH, ISOLATED_DB_PATH + '-wal', ISOLATED_DB_PATH + '-shm'].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  console.log('\n========================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
