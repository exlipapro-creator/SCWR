# Test-Data Integrity Investigation & Recovery Report

**System:** Storage & CWR Charges Management System  
**Audit Date:** October 27, 2026  
**Auditor:** Principal Software Engineer & Independent Financial-Data Integrity Auditor  
**Status:** COMPLETED & RECOVERED

---

## 1. Executive Summary

During forensic verification of the Storage & CWR Charges Management System, an investigation into test-data contamination was conducted in accordance with Rule 1 and Rule 2 of the production audit directive.

The investigation conclusively established that:
1. Interactive workflow testing (`scripts/test-api-workflows.ts`) and unisolated test execution (`tests/run-all-tests.ts`) performed live database writes against the master production database (`data/cwr_storage_master.sqlite`).
2. Contaminating markers were introduced into operational records:
   - Charge ID `CHG-CJ-2026-000091-STORAGE-1`: `po_no` mutated to `PO-TEST-12345` (and subsequently `VERIFIED-PO-777`), `processing_status` mutated to `IN_REVIEW` (and subsequently `RESOLVED`), `comment` mutated to `Auditor verification in progress`, and `is_verified` mutated to `1`.
   - Shipment ID `CJ-2026-000091`: `truck_number` mutated to `AUDIT-TRUCK-999` (and subsequently `VERIFIED-TRUCK-X`), and `is_verified` mutated to `1`.
3. The database backup created on October 27, 2026 at 11:49:59 UTC (`data/backups/backup_cwr_storage_2026-10-27T11-49-59-856Z.sqlite`) was created *after* the workflow tests executed, and therefore **also contained the contaminated records**. It could not serve as a clean baseline.
4. The $270.00 financial discrepancy noted in earlier reports (where a custom report of `PENDING` charges totaled $56,086.40 instead of $56,356.40) was **100% caused by this test mutation**: mutating `CHG-CJ-2026-000091-STORAGE-1` ($270.00) from `PENDING` to `IN_REVIEW` excluded it from the pending filter (95 charges - 1 charge = 94 charges; $56,356.40 - $270.00 = $56,086.40).
5. A reversible, transaction-safe, fully audited restoration was executed via `scripts/reconcile-and-recover.ts`. The master database records have been restored to exact source-workbook fidelity, and the automated test suites have been re-engineered for strict isolation.

---

## 2. File Inventory & SHA-256 Hashes

| Asset | Path | Size (Bytes) | SHA-256 Hash | Integrity Status |
| :--- | :--- | :--- | :--- | :--- |
| **Source Workbook** | `data/Storage_and_CWR_Charges_SEPT_2026_.xlsx` | 75,831 | `33fa122e1ad4de7aa5a1504f447f4c6184d9aa5ff92f40aa3cc26c4d88c3bd7d` | Pristine Reference (Read-Only) |
| **Master Database** | `data/cwr_storage_master.sqlite` | 512,000 | `3d47a790b93598fb632af6f0e30ef7d7c0975a3106f8afe82bd8e4167dea7567` | Restored & Audited |
| **Post-Test Backup** | `data/backups/backup_cwr_storage_2026-10-27T11-49-59-856Z.sqlite` | 507,904 | `6a283133e3326c98b0ffb3885da34c33996699c99c747ae0bb1bba92c9366382` | Contaminated (Documented) |

---

## 3. Investigation Findings & Forensics

### 3.1 Mechanism of Contamination
- In `server/db.ts`, the database connection was originally initialized with a hard-coded path to `data/cwr_storage_master.sqlite`.
- When workflow tests (`scripts/test-api-workflows.ts`) sent HTTP requests to the live server on port 3000, updates were applied to the master database.
- Furthermore, `tests/run-all-tests.ts` directly imported `server/db.ts`. Suite 5 tested manual verification protection by running SQL `UPDATE` queries against `CHG-CJ-2026-000091-STORAGE-1` and `CJ-2026-000091` without rolling back.

### 3.2 Specific Mutations Identified
Forensic query against `data/cwr_storage_master.sqlite`:
```sql
SELECT id, po_no, processing_status, comment, is_verified 
FROM charge_entries 
WHERE id = 'CHG-CJ-2026-000091-STORAGE-1';
```
Result before recovery:
- `po_no`: `'VERIFIED-PO-777'` (mutated from `'Pending'`)
- `processing_status`: `'RESOLVED'` (mutated from `'PENDING'`)
- `comment`: `'Auditor verification in progress'`
- `is_verified`: `1` (mutated from `0`)

Shipment query:
```sql
SELECT shipment_id, truck_number, is_verified 
FROM shipment_details_24 
WHERE shipment_id = 'CJ-2026-000091';
```
Result before recovery:
- `truck_number`: `'VERIFIED-TRUCK-X'` (earlier `'AUDIT-TRUCK-999'`, mutated from `'T361DXB/T187DQA'`)
- `is_verified`: `1` (mutated from `0`)

### 3.3 Post-Test Backup Inspection
Inspection of `data/backups/backup_cwr_storage_2026-10-27T11-49-59-856Z.sqlite`:
- Charge `CHG-CJ-2026-000091-STORAGE-1`: `po_no = 'PO-TEST-12345'`, `processing_status = 'IN_REVIEW'`.
- Shipment `CJ-2026-000091`: `truck_number = 'AUDIT-TRUCK-999'`.
- **Conclusion:** The backup was generated immediately after the initial test script executed. Restoring this backup would re-contaminate the database. It has been quarantined as forensic evidence.

---

## 4. Pristine Source Evidence & Baseline Verification

The original source workbook `data/Storage_and_CWR_Charges_SEPT_2026_.xlsx` provides uncompromised baseline values:

1. **Worksheet `Pending PO` (Row 3, S/N 1):**
   - `S/N`: `1`
   - `FILE No. `: `CJ-2026-000091`
   - `B/L No. `: `KMTCTA08505575`
   - `Details`: `Storage Charges`
   - `PO NO. `: `Pending`
   - `TOTAL`: Formula `=150+120` (Evaluated: `$270.00`)
   - `COMMENT`: `RECEIVED FINAL BILL OF LADING LATELY FROM CLIENT`

2. **Worksheet `Report` (Row 3):**
   - `File No`: `CJ-2026-000091`
   - `Truck Number`: `T361DXB/T187DQA`
   - `Status`: Unverified / Initial Ingestion

---

## 5. Master Database Reversible Recovery Execution

An automated, transaction-wrapped, audited recovery script (`scripts/reconcile-and-recover.ts`) was executed on October 27, 2026.

### 5.1 Audit Trail Logged
Two audit trail events were inserted into `audit_events`:
1. `AUDIT-1793102521199-1`:
   - Entity: `charge_entry`, ID: `CHG-CJ-2026-000091-STORAGE-1`
   - Action: `CONTAMINATION_ROLLBACK`
   - Actor: `auditor-reconciliation-engine`
   - Reason: `Reversed test mutations (PO-TEST-12345 / VERIFIED-PO-777) back to pristine source workbook baseline.`
2. `AUDIT-1793102521199-2`:
   - Entity: `shipment_details`, ID: `CJ-2026-000091`
   - Action: `CONTAMINATION_ROLLBACK`
   - Actor: `auditor-reconciliation-engine`
   - Reason: `Reversed test mutations (AUDIT-TRUCK-999 / VERIFIED-TRUCK-X) back to pristine source workbook baseline.`

### 5.2 Post-Recovery Verification
Queries executed immediately post-recovery:
```sql
SELECT id, po_no, processing_status, comment, is_verified 
FROM charge_entries 
WHERE id = 'CHG-CJ-2026-000091-STORAGE-1';
```
**Result:**
- `po_no`: `Pending`
- `processing_status`: `PENDING`
- `comment`: `RECEIVED FINAL BILL OF LADING LATELY FROM CLIENT`
- `is_verified`: `0`

```sql
SELECT shipment_id, truck_number, is_verified 
FROM shipment_details_24 
WHERE shipment_id = 'CJ-2026-000091';
```
**Result:**
- `truck_number`: `T361DXB/T187DQA`
- `is_verified`: `0`

Global scan for test markers across the entire database:
- `SELECT COUNT(*) FROM charge_entries WHERE po_no LIKE '%TEST%' OR po_no LIKE '%VERIFIED%' OR comment LIKE '%Audit%'` -> **0**
- `SELECT COUNT(*) FROM shipment_details_24 WHERE truck_number LIKE '%TEST%' OR truck_number LIKE '%AUDIT%' OR truck_number LIKE '%VERIFIED%'` -> **0**

---

## 6. Prevention of Future Contamination

To ensure tests can never mutate the master database again:
1. `server/db.ts` was refactored to support the `DATABASE_PATH` environment variable:
   ```ts
   export const DB_PATH = process.env.DATABASE_PATH
     ? path.resolve(process.env.DATABASE_PATH)
     : path.join(DB_DIR, 'cwr_storage_master.sqlite');
   ```
2. Automated test runners (`tests/run-all-tests.ts` and `tests/test-backup-restore-isolated.ts`) run strictly against isolated temporary databases (`data/test_cwr_isolated.sqlite`), verifying that the master database SHA-256 hash remains byte-identical before and after test execution.
