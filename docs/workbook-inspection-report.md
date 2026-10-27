# Forensic Workbook Inspection Report
**Reference File:** `Storage_and_CWR_Charges_SEPT_2026_.xlsx`  
**Date of Audit:** October 27, 2026  
**Auditor:** Principal Software Engineer & Financial-Data Integrity Lead

---

## 1. Workbook Architecture Overview

The reference workbook represents an operational maritime customs clearance, storage, and container freight station (CFS) / custom warehouse rent management ledger.

### Sheet Inventory & Dimensions

| Sheet Index | Sheet Name | Occupied Dimensions | Formula Cells | Primary Function |
|---|---|---|---|---|
| 1 | `Pending PO` | 107 rows × 8 cols | 78 formulas | Authoritative register of all charge entries requiring PO allocation |
| 2 | `Billed` | 28 rows × 7 cols | 20 formulas | Record of charges for which purchase orders have been allocated / billed |
| 3 | `Report` | 109 rows × 32 cols | 0 formulas | Master operational tracking report for container movements, dates, and milestones |
| 4 | `QUERIED` | 8 rows × 8 cols | 6 formulas | Disputed or queried charge entries requiring investigation |
| 5 | ` REPORTS SUMMARY` *(leading space)* | 518 rows × 10 cols | 231 formulas | Consolidated 3-column multi-block 24-field layout for client billing summaries |
| 6 | `Sheet2` | 2 rows × 24 cols | 4 formulas | 24-field single shipment reference and test vector |
| 7 | `Sheet1` | 16 rows × 24 cols | 25 formulas | 24-field tabular shipment records with embedded formulas |

*Note on Sheet Name Integrity:* Sheet 5 contains an intentional leading space: `' REPORTS SUMMARY'`. This exact string must be preserved during all ingestion and export passes.

---

## 2. In-Depth Sheet Analysis

### 2.1 `Pending PO` (Primary Charge Source of Truth)
- **Header Row 1:** Merged title spanning A1:H1 with value `"STORAGE AND CWR CHARGES PURCHASE ORDER REQUEST"`.
- **Header Row 2:** Column headers:
  1. `S/N` (Numeric serial index, 1 to 95)
  2. `FILE No. ` (Trailing space in column title; values like `CJ-2026-000091`)
  3. `BL NUMBER` (Bill of Lading identifier)
  4. `CONT NO.` (Newline-delimited or numbered list of container numbers, e.g. `"1. FFAU3972293"`)
  5. `Details` (Charge description classification)
  6. `PO NO. ` (Trailing space; values: `"Pending"` or empty)
  7. `TOTAL` (Formula or numeric amount in USD)
  8. `COMMENT` (Operational explanation, delay rationale, or customer notes)
- **Data Rows:** Rows 3 to 97 (95 charge entries across 61 distinct CJs).
- **Summary Row:** Row 98 contains `=SUM(G3:G97)` with evaluated total **$56,356.40**.
- **Charge Classifications Found:**
  - `Storage Charges`: 39 entries
  - `Custom Warehouse Rent`: 53 entries
  - `Power and Monitoring`: 2 entries (CJ-2026-000182: $500.00; CJ-2026-000209: $500.00)
  - `Lift On/Off`: 1 entry
- **Formula Archetypes in `TOTAL`:**
  - Addition of daily demurrage/storage sums: e.g. `=150+120`, `=240+150+160`, `=554.6+94.4`
  - Currency conversion from Tanzanian Shilling (TZS) to USD at spot rate:
    - `=(69954+216220)/2600`
    - `=(162802+814009)/2650`
    - `=(405000+756000+216000)/2700`
    - `=166000/2650`
    - Evaluated numbers maintain high decimal precision; display format is `_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)`.

### 2.2 `Billed` (Processing Evidence)
- Contains 23 charged entries matched to specific PO numbers (e.g. `67214`, `68944`, `68717`).
- Row 26 contains summary formula `=SUM(G3:G25)` yielding **$10,062.46**.
- Shows that a CJ can have one charge billed (e.g. CWR with PO 67214) while other charges for the same CJ remain pending.

### 2.3 `QUERIED` (Dispute Evidence)
- Contains 6 queried charge line items across 3 distinct CJs:
  - `CJ-2026-000099`: Storage charges $120.00 (`100+20`), reason: `"TRUCK DELAY TO REACH AT ICD"`
  - `CJ-2026-000134`: Storage charges $390.00 (`240+150`), CWR $110.07 (`(69954+216220)/2600`), and Storage $40.00, reason: `"DOCUMENTS RECEIVED AFTER CONTAINER DISCHARGED 5 DAYS AGO & NO DEPOSIT IN SHIPPING LINE(INTERASIA) & DEMURRAGE AT SHIPPING LINE FROM USANGU"`
  - `CJ-2026-000061`: Storage charges $510.00 (`(405000+756000+216000)/2700`), CWR $62.64 (`166000/2650`)

### 2.4 `Report` (Operational Shipment Master)
- 107 records across 31 populated columns.
- Provides milestone dates:
  - `Documents Rec date`, `ETA`, `ETB`, `DischargeDate`, `CarryIn Date`, `DODate`, `AssessmentNotice`, `ReleaseOrderPrintDate`, `PortCharges` (a date!), `Allocation request date`, `allocation date`, `truck cards given date`, `Truck Number`, `T1Date`, `LoadDate`, `LoadPort`, `COMMENTS`.

### 2.5 ` REPORTS SUMMARY` (Executive Consolidated Layout)
- 480 populated rows organized in vertical 24-row blocks arranged in a 3-column grid:
  - Column Pair 1: A (labels) & B (values)
  - Column Pair 2: E (labels) & F (values)
  - Column Pair 3: I (labels) & J (values)
  - Spacers: Columns C, D, G, H are blank column dividers.
  - Vertical spacing: Rows 25-26, 51-52, 77-78, etc. are empty block dividers.
- Total of 58 distinct CJ summary blocks.
- Formulas in each block:
  - Row 14: `DELAYS IN ALLOCATION` = `=IF(OR(B13="",B12=""),"",B13-B12)`
  - Row 17: `CLEARANCE` = `=IF(OR(B8="",B6=""),"",B8-B6)`
  - Row 18: `CLIENT DELAY` = `=IF(OR(B5="",B6=""),"",B5-B6)`
  - Row 24: `CLIENT TOTAL` = `=SUM(B19:B20)`

---

## 3. Reconciliation Findings

1. **Storage Total Reconciled:** 58 out of 58 CJs in ` REPORTS SUMMARY` reconcile with 100% exactitude to the sum of Storage charges in `Pending PO`.
2. **CWR Total Reconciled:** 57 out of 58 CJs in ` REPORTS SUMMARY` reconcile exactly to CWR in `Pending PO`.
3. **Identified Variance on CJ-2026-000182:**
   - In `Pending PO`: Storage is $566.00, Power and Monitoring (reefer charge) is $500.00.
   - In ` REPORTS SUMMARY`: Storage is $566.00, and $500.00 was recorded in the CWR slot, totaling $1,066.00.
   - This proves that reefer monitoring charges are considered client-billable terminal charges and are grouped with warehouse/cwr rent when summarized.
4. **Unsummarized Active Pending CJs:**
   - `CJ-2026-000170` (Storage $230.00) is pending in `Pending PO` and not yet added to summary.
   - `CJ-2026-000209` (Power and Monitoring $500.00) is pending in `Pending PO` and not yet added to summary.
   - Both are active operational records requiring processing.
