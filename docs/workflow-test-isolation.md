# Workflow Test Isolation & Zero-Contamination Architecture

**System:** Storage & CWR Charges Management System  
**Audit Date:** October 27, 2026  
**Auditor:** Principal Software Engineer & Independent Financial-Data Integrity Auditor  
**Standard:** 100% Master Production Database Immutability During Automated Testing

---

## 1. Problem Statement & Risk Analysis

In earlier revisions of the application:
1. `server/db.ts` hardcoded the SQLite database path directly to `data/cwr_storage_master.sqlite`.
2. Integration and workflow test scripts (e.g. `tests/run-all-tests.ts` and `scripts/test-api-workflows.ts`) imported the database singleton directly or dispatched mutation requests against the active dev server on port 3000.
3. As a result, automated assertions that tested verification protection, status transitions, and shipment corrections applied persistent writes (`PO-TEST-12345`, `AUDIT-TRUCK-999`, `VERIFIED-PO-777`, `RESOLVED`) directly to master production records (`CHG-CJ-2026-000091-STORAGE-1` and `CJ-2026-000091`).
4. This mutated production operational records, compromised database backups taken post-test, and induced an artificial 70.00 discrepancy in pending charge queries.

---

## 2. Zero-Contamination Architecture

To eliminate this vulnerability permanently, a strict multi-layered isolation architecture was implemented.

- Automated test runners dynamically route database calls via process.env.DATABASE_PATH to an ephemeral test database (`data/test_cwr_isolated.sqlite`).
- Ephemeral databases are cleanly initialized and purged on every test run.
- Master production database hash (SHA-256) is recorded before test runs and asserted to be byte-identical after test completion.
- Interactive workflow tests are banned from targeting port 3000.

---

## 3. Implementation Details

### 3.1 Dynamic Database Routing (server/db.ts)
The database connection factory was refactored:
```typescript
export const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(DB_DIR, 'cwr_storage_master.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

### 3.2 Immutability Assertion
At the conclusion of the test run:
```typescript
const masterHashAfter = hashFile(MASTER_DB_PATH);
assert(
  masterHashBefore === masterHashAfter,
  'Master production database remained 100% untouched and byte-identical throughout entire test suite execution'
);
```

---

## 4. Verification Evidence

Executing the isolated test suite:
```bash
DATABASE_PATH=data/test_cwr_isolated.sqlite npx tsx tests/run-all-tests.ts
```
**Results:**
- Suite 1: Central Calculation Engine Unit Tests (18/18 passed)
- Suite 2: Workbook Ingestion & Master DB Reconciliation (13/13 passed)
- Suite 3: Excel Export & Round-Trip Preservation Tests (5/5 passed)
- Suite 4: Idempotency & Duplicate Re-Import Protection (1/1 passed)
- Suite 5: Verification Protection & Non-Destructive Ingestion (3/3 passed)
- Suite 6: Transaction Atomicity & Failure Rollback (1/1 passed)
- Master Production Database: 3d47a790b93598fb632af6f0e30ef7d7c0975a3106f8afe82bd8e4167dea7567 (100% UNTOUCHED).

---

## 5. Standard Operating Procedure for Future Tests

1. Unit and Integration Tests: Always execute with DATABASE_PATH=data/test_cwr_isolated.sqlite.
2. Never Point Automated Tests at the Live Master Database or Port 3000.
