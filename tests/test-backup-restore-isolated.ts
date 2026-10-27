import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';

function hashFile(p: string): string {
  if (!fs.existsSync(p)) return 'MISSING';
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export async function runIsolatedBackupRestoreTest() {
  console.log('===============================================================');
  console.log('TEST SUITE: ISOLATED BACKUP AND RESTORATION VERIFICATION');
  console.log('===============================================================');

  const MASTER_DB = path.resolve('data/cwr_storage_master.sqlite');
  const masterHashBefore = hashFile(MASTER_DB);

  const TEST_DIR = path.resolve('data/test_isolation');
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

  const SOURCE_DB_PATH = path.join(TEST_DIR, 'source_isolated.sqlite');
  const BACKUP_DB_PATH = path.join(TEST_DIR, 'backup_isolated.sqlite');
  const RESTORED_DB_PATH = path.join(TEST_DIR, 'restored_isolated.sqlite');

  // Clean previous artifacts if any
  [SOURCE_DB_PATH, BACKUP_DB_PATH, RESTORED_DB_PATH].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
    if (fs.existsSync(f + '-wal')) fs.unlinkSync(f + '-wal');
    if (fs.existsSync(f + '-shm')) fs.unlinkSync(f + '-shm');
  });

  console.log('1. Creating isolated source database with realistic schema and data...');
  const srcDb = new Database(SOURCE_DB_PATH);
  srcDb.pragma('journal_mode = WAL');
  srcDb.pragma('foreign_keys = ON');

  srcDb.exec(`
    CREATE TABLE shipments (
      id TEXT PRIMARY KEY,
      raw_cj TEXT NOT NULL,
      bl TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE charge_entries (
      id TEXT PRIMARY KEY,
      cj TEXT NOT NULL,
      details TEXT NOT NULL,
      classification TEXT NOT NULL,
      amount REAL NOT NULL,
      processing_status TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE shipment_details_24 (
      shipment_id TEXT PRIMARY KEY,
      file_no TEXT NOT NULL,
      truck_number TEXT,
      storage_amount REAL DEFAULT 0,
      cwr_amount REAL DEFAULT 0,
      is_verified INTEGER DEFAULT 0
    );
  `);

  const insertTx = srcDb.transaction(() => {
    srcDb.prepare("INSERT INTO shipments VALUES ('CJ-ISO-001', 'CJ-2026-ISO-001', 'BL-ISO-888', datetime('now'))").run();
    srcDb.prepare("INSERT INTO charge_entries VALUES ('CHG-ISO-1', 'CJ-ISO-001', 'Storage Charges', 'STORAGE', 450.50, 'PENDING')").run();
    srcDb.prepare("INSERT INTO charge_entries VALUES ('CHG-ISO-2', 'CJ-ISO-001', 'Custom Warehouse Rent', 'CWR', 320.00, 'PENDING')").run();
    srcDb.prepare("INSERT INTO shipment_details_24 VALUES ('CJ-ISO-001', 'CJ-ISO-001', 'T123ISO/T456ISO', 450.50, 320.00, 1)").run();
  });
  insertTx();

  const srcShipmentCount = (srcDb.prepare('SELECT COUNT(*) as cnt FROM shipments').get() as any).cnt;
  const srcChargeCount = (srcDb.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
  const srcDetailsCount = (srcDb.prepare('SELECT COUNT(*) as cnt FROM shipment_details_24').get() as any).cnt;
  const srcChargeTotal = (srcDb.prepare('SELECT ROUND(SUM(amount), 2) as sm FROM charge_entries').get() as any).sm;

  console.log(`   Source DB: ${srcShipmentCount} shipments, ${srcChargeCount} charges ($${srcChargeTotal}), ${srcDetailsCount} details`);

  console.log('2. Performing VACUUM INTO backup operation to isolated destination...');
  srcDb.prepare('VACUUM INTO ?').run(BACKUP_DB_PATH);
  srcDb.close();

  if (!fs.existsSync(BACKUP_DB_PATH)) {
    throw new Error('FAIL: Backup destination file was not created!');
  }
  const backupSize = fs.statSync(BACKUP_DB_PATH).size;
  console.log(`   Backup created successfully (${backupSize} bytes)`);

  console.log('3. Performing simulated recovery/restore to secondary isolated database...');
  // Simulating atomic restore by copying verified backup to restored target path
  fs.copyFileSync(BACKUP_DB_PATH, RESTORED_DB_PATH);

  const restoredDb = new Database(RESTORED_DB_PATH);
  restoredDb.pragma('journal_mode = WAL');

  console.log('4. Verifying record integrity, schema, and financial parity in restored database...');
  const resShipmentCount = (restoredDb.prepare('SELECT COUNT(*) as cnt FROM shipments').get() as any).cnt;
  const resChargeCount = (restoredDb.prepare('SELECT COUNT(*) as cnt FROM charge_entries').get() as any).cnt;
  const resDetailsCount = (restoredDb.prepare('SELECT COUNT(*) as cnt FROM shipment_details_24').get() as any).cnt;
  const resChargeTotal = (restoredDb.prepare('SELECT ROUND(SUM(amount), 2) as sm FROM charge_entries').get() as any).sm;
  const sampleDetail = restoredDb.prepare("SELECT * FROM shipment_details_24 WHERE shipment_id = 'CJ-ISO-001'").get() as any;

  restoredDb.close();

  const assertions = [
    { name: 'Shipment count matches exactly', pass: resShipmentCount === srcShipmentCount },
    { name: 'Charge entry count matches exactly', pass: resChargeCount === srcChargeCount },
    { name: 'Shipment details count matches exactly', pass: resDetailsCount === srcDetailsCount },
    { name: 'Financial sum matches exactly', pass: resChargeTotal === srcChargeTotal },
    { name: 'Sample record values preserved', pass: sampleDetail?.truck_number === 'T123ISO/T456ISO' && sampleDetail?.is_verified === 1 }
  ];

  assertions.forEach(a => {
    if (a.pass) console.log(`   ✓ ${a.name}`);
    else {
      console.error(`   ✗ FAIL: ${a.name}`);
      throw new Error(`Assertion failed: ${a.name}`);
    }
  });

  console.log('5. Verifying master production database was completely protected...');
  const masterHashAfter = hashFile(MASTER_DB);
  if (masterHashBefore !== masterHashAfter) {
    throw new Error('CRITICAL INTEGRITY FAILURE: Master production database was modified during isolated test!');
  }
  console.log(`   ✓ Master production database unchanged (SHA-256: ${masterHashAfter.substring(0, 16)}...)`);

  // Cleanup test artifacts
  [SOURCE_DB_PATH, BACKUP_DB_PATH, RESTORED_DB_PATH].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
    if (fs.existsSync(f + '-wal')) fs.unlinkSync(f + '-wal');
    if (fs.existsSync(f + '-shm')) fs.unlinkSync(f + '-shm');
  });
  if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR);

  console.log('\nIsolated Backup & Restore Verification: ALL CHECKS PASSED PERFECTLY.');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runIsolatedBackupRestoreTest().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
