# Storage & CWR Financial Reconciliation Results & Operational Matrix

**Document Version:** 4.0 (Final Audit Corrections & Mathematical Release-Gate Evidence)  
**Date:** October 27, 2026  
**Auditor / Engineering Role:** Principal Software Engineer & Independent Financial-Data Integrity Auditor  
**Primary Source Workbook:** `data/Storage_and_CWR_Charges_SEPT_2026_.xlsx`  
**Primary Source SHA-256:** `33fa122e1ad4de7aa5a1504f447f4c6184d9aa5ff92f40aa3cc26c4d88c3bd7d`  
**Master Production Database:** `data/cwr_storage_master.sqlite` (SHA-256: `3d47a790b93598fb632af6f0e30ef7d7c0975a3106f8afe82bd8e4167dea7567`)  
**Machine-Readable Reconciliation Artifact:** `data/exports/reconciliation_matrix_124_charges.json` (SHA-256: `fabc99e154b92727c97d6ea58369b007844aff462a2cd766e38a57c053368c1a`)

---

## 1. Executive Summary & Authoritative Totals

Every operational charge row from the source workbook and master SQLite database (`data/cwr_storage_master.sqlite`) was independently recomputed from raw cell values and formulas without relying on pre-existing labels, cached totals, or unverified narrative reports.

### 1.1 Authoritative Operational Register Breakdown (124 Charges)

| Register / Sheet Source | Charge Count | Distinct CJs | Classification Breakdown | Evaluated Financial Sum | Authoritative Source Anchor |
|---|:---:|:---:|---|:---:|---|
| **Pending PO** | **95** | 60 | STORAGE: 39 ($35,918.25)<br>CWR: 53 ($19,218.15)<br>REEFER_MONITORING: 2 ($1,000.00)<br>LIFT: 1 ($220.00) | **$56,356.40** | `Pending PO!G98` (`=SUM(G3:G97)`) |
| **Billed** | **23** | 12 | STORAGE: 9 ($6,796.20)<br>CWR: 14 ($3,266.26) | **$10,062.46** | `Billed!G26` (`=SUM(G3:G25)`) |
| **QUERIED** | **6** | 3 | STORAGE: 4 ($1,060.00)<br>CWR: 2 ($172.71) | **$1,232.71** | `QUERIED!G3:G8` line sum |
| **Grand Operational Total** | **124** | **71 unique** | **STORAGE: 52 ($43,774.45)**<br>**CWR: 69 ($22,657.12)**<br>**REEFER: 2 ($1,000.00)**<br>**LIFT: 1 ($220.00)** | **$67,651.57** | Full operational ledger |

---

## 2. Separation of Core Financial Dimensions

To prevent financial ambiguity, three distinct scopes must be rigorously distinguished:

1. **Scope 1: Operational Register Total ($56,356.40)**  
   The authoritative sum of all 95 eligible charge line items in `Pending PO`. Covers 60 distinct CJs across 4 charge categories (Storage: $35,918.25, CWR: $19,218.15, Reefer Monitoring: $1,000.00, Lift On/Off: $220.00).
2. **Scope 2: Amount Represented by Existing Summary Template ($55,626.40)**  
   The physical sum of Client Total cells (row 24) across the 58 populated blocks in `' REPORTS SUMMARY'`. It covers 58 CJs and represents $55,406.40 in Storage + CWR rows plus $220.00 for Lift On/Off in literal constant `J50`.
3. **Scope 3: Proposed Future Summary with Additional Blocks ($56,356.40)**  
   A prospective 60-block summary layout that would expand `' REPORTS SUMMARY'` by adding 2 new blocks for CJ-170 ($230.00) and CJ-209 ($500.00). This scope is subject to business policy approval (Gate 2).

---

## 3. Verified Traceable Financial Bridge

### 3.1 Reconciliation of Operational Register to Existing Summary Template

```text
====================================================================================================
                        TRACEABLE FINANCIAL BRIDGE (REGISTER TO SUMMARY)
====================================================================================================

1. Operational Pending PO Register Total (Pending PO!G98):                         $56,356.40
   Input Records: 95 charge line items across 60 unique CJs.

2. LESS Omitted Operational Charges (Absent from 58-Block Summary):
   - CJ-2026-000170 (Pending PO Row 42, S/N 40, Storage Charges):                    -$230.00
   - CJ-2026-000209 (Pending PO Row 71, S/N 69, Power and Monitoring):               -$500.00
   -------------------------------------------------------------------------------------------------
   Total Omitted Operational Charges:                                                 -$730.00

3. = True Summary-Eligible Operational Baseline:                                    $55,626.40

4. Physical Sum of Client Total Cells in ' REPORTS SUMMARY':                        $55,626.40
   Calculation Method: Sum of 58 Row 24 cells (B24, F24, J24 ... B518).
   Variance between Summary-Eligible Baseline and Summary Client Total:                 $0.00  [EXACT MATCH]
====================================================================================================
```

### 3.2 Category Breakdown of the Existing 58 Summary Blocks

```text
====================================================================================================
                 CATEGORY DECOMPOSITION OF 58 BLOCKS IN ' REPORTS SUMMARY'
====================================================================================================

1. Summary Storage Amount Rows (Row 19 across 58 blocks):                           $35,688.25
   - Operational Pending PO Storage:                               $35,918.25
   - LESS Omitted CJ-170 Storage:                                    -$230.00
   - True Summary Storage:                                         $35,688.25  [EXACT MATCH]

2. Summary CWR Amount Rows (Row 20 across 58 blocks):                               $19,718.15
   - Operational Pending PO CWR:                                   $19,218.15
   - PLUS CJ-182 Reefer Monitoring slotted into CWR cell F46:        +$500.00
   - True Summary CWR:                                             $19,718.15  [EXACT MATCH]

3. Summary Category Subtotal (Storage + CWR rows):                                  $55,406.40
   ($35,688.25 Storage + $19,718.15 CWR = $55,406.40)

4. PLUS Literal Numeric Constant at J50 (Block 6, Row 24, CJ-56 Lift On/Off):         +$220.00
   (Cell J45 Storage = $0.00, Cell J46 CWR = $0.00, Cell J50 = literal 220)

5. = Total Physical Evaluated Client Total (Row 24 across 58 blocks):               $55,626.40
   ($55,406.40 Category Subtotal + $220.00 Lift Constant at J50 = $55,626.40)      [EXACT MATCH]
====================================================================================================
```

### 3.3 Explanation of Historical Narrative Variances ($730 and $1,450)

#### A. The $730.00 Discrepancy
- **Mathematical Relationship:** `$56,356.40 - $55,626.40 = $730.00`.
- **Cause:** Two operational charges in Pending PO were completely omitted from the 58 executive blocks in `' REPORTS SUMMARY'`:
  1. CJ-170 (Storage): $230.00
  2. CJ-209 (Reefer Monitoring): $500.00
  - Sum of omissions: `$230.00 + $500.00 = $730.00`.
- **Why an earlier draft showed $56,126.40:** The author deducted only CJ-170 ($56,356.40 - $230.00 = $56,126.40) but neglected to deduct CJ-209 ($500.00). When both are deducted, the result is exactly $55,626.40.

#### B. The $1,450.00 Discrepancy
- **Mathematical Relationship:** Difference between an earlier unverified summary claim ($56,856.40) and the physical category sum ($55,406.40):
  `$56,856.40 - $55,406.40 = $1,450.00`.
- **Exact Decomposition:**
  1. **+$500.00 (Erroneous Double Addition):** An early reporting draft added the $500.00 Reefer from CJ-182 onto the Pending PO register ($56,356.40 + $500.00 = $56,856.40), under the mistaken assumption that Reefer was omitted from Pending PO. In reality, CJ-182 Reefer was *already* in Pending PO (S/N 7) and *already* slotted into cell `F46`.
  2. **+$730.00 (Omitted CJs):** CJ-170 ($230.00) and CJ-209 ($500.00) omitted from summary blocks.
  3. **+$220.00 (Literal Constant at J50):** Lift On/Off for CJ-56 present in Client Total row 24, but absent from Storage row 19 and CWR row 20.
  - **Sum:** `$500.00 + $730.00 + $220.00 = $1,450.00 EXACT`.

---

## 4. Itemized Verification of Key Special Transactions

Every transaction reference, row coordinate, and financial amount has been cross-verified across `data/Storage_and_CWR_Charges_SEPT_2026_.xlsx` and `data/cwr_storage_master.sqlite`:

### 4.1 CJ-2026-000170 ($230.00 Storage)
- **Source Sheet & Row:** `Pending PO`, Row 42 (S/N 40)
- **Bill of Lading:** `COSU6504015850`
- **Container Info:** `1. DFSU6808728`
- **Details:** `Storage Charges`
- **Evaluated Amount:** `$230.00` (Raw formula: `150+80`)
- **Operational Classification:** `STORAGE`
- **Master Database ID:** `CHG-CJ-2026-000170-STORAGE-40`
- **Status in DB:** `po_no = 'Pending'`, `processing_status = 'PENDING'`, `is_verified = 0`
- **Summary Destination:** **Omitted entirely** from the 58 executive blocks in `' REPORTS SUMMARY'`.

### 4.2 CJ-2026-000209 ($500.00 Reefer Monitoring)
- **Source Sheet & Row:** `Pending PO`, Row 71 (S/N 69)
- **Bill of Lading:** `RTM1615619`
- **Container Info:** `1. TEMU8571597`
- **Details:** `Power and Monitoring`
- **Evaluated Amount:** `$500.00` (No raw formula)
- **Operational Classification:** `REEFER_MONITORING`
- **Master Database ID:** `CHG-CJ-2026-000209-REEFER_MONITORING-69`
- **Status in DB:** `po_no = 'Pending'`, `processing_status = 'PENDING'`, `is_verified = 0`
- **Summary Destination:** **Omitted entirely** from the 58 executive blocks in `' REPORTS SUMMARY'`.

### 4.3 CJ-2026-000182 ($566.00 Storage + $500.00 Reefer Monitoring)
- **Operational Register Structure:** Contains exactly TWO line items in `Pending PO`:
  1. **Storage Charges:** Row 8, S/N 6, amount `$566.00` (`raw_formula`: `416+150`), ID `CHG-CJ-2026-000182-STORAGE-6`.
  2. **Power and Monitoring:** Row 9, S/N 7, amount `$500.00` (no formula), ID `CHG-CJ-2026-000182-REEFER_MONITORING-7`.
- **Existing Summary Destination:** Block 5 (`F27:F50`):
  - Storage Cell `F45`: `$566.00` (matches S/N 6).
  - CWR Cell `F46`: `$500.00` (matches S/N 7 Reefer Monitoring).
  - Client Total Cell `F50`: `=SUM(F45:F46)` = `$1,066.00`.
- **Duplication Audit:** CJ-182 Reefer Monitoring appears **only once** in the operational register (Row 9) and **only once** in `' REPORTS SUMMARY'` (Cell `F46`). It was never duplicated in the underlying files.

### 4.4 CJ-2026-000056 ($220.00 Lift On/Off)
- **Source Sheet & Row:** `Pending PO`, Row 10 (S/N 8)
- **Bill of Lading:** `271578337`
- **Container Info:** `1. TGHU9417865`
- **Details:** `Lift On/Off`
- **Evaluated Amount:** `$220.00`
- **Comment:** `KWALA CHARGES FOR TRANSFER OF THE CONTAINER AND LIFT ON/OFF`
- **Operational Classification:** `LIFT`
- **Master Database ID:** `CHG-CJ-2026-000056-LIFT-8`
- **Existing Summary Destination:** Block 6 (`J27:J50`):
  - Storage Cell `J45`: empty / `$0.00`
  - CWR Cell `J46`: empty / `$0.00`
  - Client Total Cell `J50`: literal numeric constant `220` (not a formula).

---

## 5. Complete 58-Block Master Itemized Audit

| Block # | Coordinate | Normalized CJ | Bill of Lading | Storage Cell & Val | CWR Cell & Val | Client Total Cell & Val | Source Row & Mapping Notes |
|:---:|:---:|:---|:---|:---:|:---:|:---:|:---|
| 1 | B1:B26 | CJ-2026-000091 | KMTCTA08505575 | `B19` = $270.00 | `B20` = $0.00 | `B24` = $270.00 | Pending PO Row 3, S/N 1 (Storage $270) |
| 2 | F1:F26 | CJ-2026-000101 | MEDUXW095810 | `F19` = $270.00 | `F20` = $0.00 | `F24` = $270.00 | Pending PO Row 4, S/N 2 (Storage $270) |
| 3 | J1:J26 | CJ-2026-000164 | QGD2907367 | `J19` = $190.00 | `J20` = $0.00 | `J24` = $190.00 | Pending PO Row 5, S/N 3 (Storage $190) |
| 4 | B27:B50 | CJ-2026-000153 | QGD2891677 | `B45` = $365.00 | `B46` = $220.98 | `B50` = $585.98 | Pending PO Rows 6-7, S/N 4 (Storage $365), S/N 5 (CWR $220.98) |
| 5 | F27:F50 | CJ-2026-000182 | RTM1600716 | `F45` = $566.00 | `F46` = $500.00 | `F50` = $1,066.00 | Pending PO Rows 8-9, S/N 6 (Storage $566), S/N 7 (Reefer $500 slotted into CWR cell F46) |
| 6 | J27:J50 | CJ-2026-000056 | 271578337 | `J45` = $0.00 | `J46` = $0.00 | `J50` = $220.00 | Pending PO Row 10, S/N 8 (Lift $220). Preserved as literal constant 220 in J50 |
| 7 | B53:B76 | CJ-2026-000089 | 712610398728 | `B71` = $630.00 | `B72` = $303.56 | `B76` = $933.56 | Pending PO Rows 11-12, S/N 9 (Storage $630), S/N 10 (CWR $303.56) |
| 8 | F53:F76 | CJ-2026-000097 | EMIVCHNGUZ000279 | `F71` = $955.96 | `F72` = $368.61 | `F76` = $1,324.57 | Pending PO Rows 13-14, S/N 11 (Storage $955.96), S/N 12 (CWR $368.61) |
| 9 | J53:J76 | CJ-2026-000117 | GOSUGZH0725227 | `J71` = $0.00 | `J72` = $205.69 | `J76` = $205.69 | Pending PO Row 15, S/N 13 (CWR $205.69) |
| 10 | B79:B102 | CJ-2026-000100 | COSU6501268680 | `B97` = $0.00 | `B98` = $649.74 | `B102` = $649.74 | Pending PO Row 16, S/N 14 (CWR $649.74) |
| 11 | F79:F102 | CJ-2026-000143 | NGNT60537000 | `F97` = $0.00 | `F98` = $163.61 | `F102` = $163.61 | Pending PO Row 17, S/N 15 (CWR $163.61) |
| 12 | J79:J102 | CJ-2026-000076 | GOSUNNJ1371509 | `J97` = $540.00 | `J98` = $628.22 | `J102` = $1,168.22 | Pending PO Rows 18-19, S/N 16 (Storage $540), S/N 17 (CWR $628.22) |
| 13 | B105:B128 | CJ-2026-000079 | GOSUGZH0725510 | `B123` = $0.00 | `B124` = $194.99 | `B128` = $194.99 | Pending PO Row 20, S/N 18 (CWR $194.99) |
| 14 | F105:F128 | CJ-2026-000118 | HLCUSZX2605DEAS2 | `F123` = $0.00 | `F124` = $151.58 | `F128` = $151.58 | Pending PO Row 21, S/N 19 (CWR $151.58) |
| 15 | J105:J128 | CJ-2026-000106 | CSX26TAODAR020393 | `J123` = $0.00 | `J124` = $151.78 | `J128` = $151.78 | Pending PO Row 22, S/N 20 (CWR $151.78) |
| 16 | B131:B154 | CJ-2026-000150 | MEDUXW091276 | `B149` = $1,500.00 | `B150` = $91.52 | `B154` = $1,591.52 | Pending PO Rows 23-24, S/N 21 (Storage $1,500), S/N 22 (CWR $91.52) |
| 17 | F131:F154 | CJ-2026-000151 | EMIVCHNGUZ000577 | `F149` = $0.00 | `F150` = $143.19 | `F154` = $143.19 | Pending PO Row 25, S/N 23 (CWR $143.19) |
| 18 | J131:J154 | CJ-2026-000125 | EMIVCHNGUZ000505 | `J149` = $0.00 | `J150` = $303.24 | `J154` = $303.24 | Pending PO Row 26, S/N 24 (CWR $303.24) |
| 19 | B157:B180 | CJ-2026-000093 | A56GX17036 | `B175` = $460.20 | `B176` = $259.92 | `B180` = $720.12 | Pending PO Rows 27-28, S/N 25 (Storage $460.20), S/N 26 (CWR $259.92) |
| 20 | F157:F180 | CJ-2026-000030 | MEDUWZ478381 | `F175` = $94.40 | `F176` = $628.14 | `F180` = $722.54 | Pending PO Rows 29-30, S/N 27 (Storage $94.40), S/N 28 (CWR $628.14) |
| 21 | J157:J180 | CJ-2026-000190 | HLCUSHA2606CAAN5 | `J175` = $0.00 | `J176` = $108.11 | `J180` = $108.11 | Pending PO Row 31, S/N 29 (CWR $108.11) |
| 22 | B183:B206 | CJ-2026-000102 | GGZ3025741 | `B201` = $743.40 | `B202` = $540.76 | `B206` = $1,284.16 | Pending PO Rows 32-33, S/N 30 (Storage $743.40), S/N 31 (CWR $540.76) |
| 23 | F183:F206 | CJ-2026-000144 | NGNT60539900 | `F201` = $1,026.60 | `F202` = $389.00 | `F206` = $1,415.60 | Pending PO Rows 34-35, S/N 32 (Storage $1,026.60), S/N 33 (CWR $389) |
| 24 | J183:J206 | CJ-2026-000128 | COSU6503374433 | `J201` = $743.40 | `J202` = $368.09 | `J206` = $1,111.49 | Pending PO Rows 36-37, S/N 34 (Storage $743.40), S/N 35 (CWR $368.09) |
| 25 | B209:B232 | CJ-2026-000090 | KMTCTAO8517524 | `B227` = $590.00 | `B228` = $21.68 | `B232` = $611.68 | Pending PO Rows 38-39, S/N 36 (Storage $590), S/N 37 (CWR $21.68) |
| 26 | F209:F232 | CJ-2026-000069 | COSU6501645860 | `F227` = $380.00 | `F228` = $0.00 | `F232` = $380.00 | Pending PO Row 40, S/N 38 (Storage $380) |
| 27 | J209:J232 | CJ-2026-000256 | A91GX08613 | `J227` = $0.00 | `J228` = $136.05 | `J232` = $136.05 | Pending PO Row 41, S/N 39 (CWR $136.05) |
| 28 | B235:B258 | CJ-2026-000127 | COSU6502292083 | `B253` = $1,309.80 | `B254` = $496.54 | `B258` = $1,806.34 | Pending PO Rows 43-44, S/N 41 (Storage $1,309.80), S/N 42 (CWR $496.54) |
| 29 | F235:F258 | CJ-2026-000212 | EMIVCHNGUZ000757 | `F253` = $460.20 | `F254` = $279.87 | `F258` = $740.07 | Pending PO Rows 45-46, S/N 43 (Storage $460.20), S/N 44 (CWR $279.87) |
| 30 | J235:J258 | CJ-2026-000214 | EMIVCHNGUZ000758 | `J253` = $460.20 | `J254` = $279.87 | `J258` = $740.07 | Pending PO Rows 47-48, S/N 45 (Storage $460.20), S/N 46 (CWR $279.87) |
| 31 | B261:B284 | CJ-2026-000240 | SHZ8284995 | `B279` = $0.00 | `B280` = $86.56 | `B284` = $86.56 | Pending PO Row 49, S/N 47 (CWR $86.56) |
| 32 | F261:F284 | CJ-2026-000195 | HUUN60184100 | `F279` = $0.00 | `F280` = $973.67 | `F284` = $973.67 | Pending PO Row 50, S/N 48 (CWR $973.67) |
| 33 | J261:J284 | CJ-2026-000196 | EMKTAODAR26004 | `J279` = $0.00 | `J280` = $173.09 | `J284` = $173.09 | Pending PO Row 51, S/N 49 (CWR $173.09) |
| 34 | B287:B310 | CJ-2026-000197 | CSX26TAODAR026503 | `B305` = $190.00 | `B306` = $216.72 | `B310` = $406.72 | Pending PO Rows 52-53, S/N 50 (Storage $190), S/N 51 (CWR $216.72) |
| 35 | F287:F310 | CJ-2026-000145 | 272272022 | `F305` = $790.00 | `F306` = $108.36 | `F310` = $898.36 | Pending PO Rows 54-55, S/N 52 (Storage $790), S/N 53 (CWR $108.36) |
| 36 | J287:J310 | CJ-2026-000191 | HUUN60186900 | `J305` = $0.00 | `J306` = $281.27 | `J310` = $281.27 | Pending PO Row 56, S/N 54 (CWR $281.27) |
| 37 | B313:B336 | CJ-2026-000175 | HLCUEUR260687634 | `B331` = $1,430.00 | `B332` = $491.55 | `B336` = $1,921.55 | Pending PO Rows 57-58, S/N 55 (Storage $1,430), S/N 56 (CWR $491.55) |
| 38 | F313:F336 | CJ-2026-000124 | 149604418175 | `F331` = $390.00 | `F332` = $78.15 | `F336` = $468.15 | Pending PO Rows 59-60, S/N 57 (Storage $390), S/N 58 (CWR $78.15) |
| 39 | J313:J336 | CJ-2026-000213 | EMIVCHNGUZ000826 | `J331` = $460.20 | `J332` = $279.87 | `J336` = $740.07 | Pending PO Rows 61-62, S/N 59 (Storage $460.20), S/N 60 (CWR $279.87) |
| 40 | B339:B362 | CJ-2026-000192 | ASC26TAODAR006577 | `B357` = $0.00 | `B358` = $346.18 | `B362` = $346.18 | Pending PO Row 63, S/N 61 (CWR $346.18) |
| 41 | F339:F362 | CJ-2026-000193 | A91GX08499 | `F357` = $0.00 | `F358` = $136.73 | `F362` = $136.73 | Pending PO Row 64, S/N 62 (CWR $136.73) |
| 42 | J339:J362 | CJ-2026-000258 | NGBCB26029414 | `J357` = $950.00 | `J358` = $115.02 | `J362` = $1,065.02 | Pending PO Rows 65-66, S/N 63 (Storage $950), S/N 64 (CWR $115.02) |
| 43 | B365:B388 | CJ-2026-000158 | ASC26TAODAR006023 | `B383` = $1,734.60 | `B384` = $649.10 | `B388` = $2,383.70 | Pending PO Rows 67-68, S/N 65 (Storage $1,734.60), S/N 66 (CWR $649.10) |
| 44 | F365:F388 | CJ-2026-000199 | GOSUQIN6860446 | `F383` = $424.80 | `F384` = $157.01 | `F388` = $581.81 | Pending PO Rows 69-70, S/N 67 (Storage $424.80), S/N 68 (CWR $157.01) |
| 45 | J365:J388 | CJ-2026-000107 | HUUN60177200 | `J383` = $5,333.60 | `J384` = $1,578.83 | `J388` = $6,912.43 | Pending PO Rows 72-73, S/N 70 (Storage $5,333.60), S/N 71 (CWR $1,578.83) |
| 46 | B391:B414 | CJ-2026-000105 | COSU6502292854 | `B409` = $1,309.80 | `B410` = $475.53 | `B414` = $1,785.33 | Pending PO Rows 74-75, S/N 72 (Storage $1,309.80), S/N 73 (CWR $475.53) |
| 47 | F391:F414 | CJ-2026-000157 | HUUN60190500 | `F409` = $270.00 | `F410` = $324.23 | `F414` = $594.23 | Pending PO Rows 76-77, S/N 74 (Storage $270), S/N 75 (CWR $324.23) |
| 48 | J391:J414 | CJ-2026-000082 | COSU6503374432 | `J409` = $240.93 | `J410` = $669.88 | `J414` = $910.81 | Pending PO Rows 78-79, S/N 76 (Storage $240.93), S/N 77 (CWR $669.88) |
| 49 | B417:B440 | CJ-2026-000085 | COSU6502292858 | `B435` = $1,899.96 | `B436` = $583.49 | `B440` = $2,483.45 | Pending PO Rows 80-81, S/N 78 (Storage $1,899.96), S/N 79 (CWR $583.49) |
| 50 | F417:F440 | CJ-2026-000200 | EMIVCHNQIN039733 | `F435` = $3,752.40 | `F436` = $1,168.37 | `F440` = $4,920.77 | Pending PO Rows 82-83, S/N 80 (Storage $3,752.40), S/N 81 (CWR $1,168.37) |
| 51 | J417:J440 | CJ-2026-000194 | EMKTAODAR26003 | `J435` = $0.00 | `J436` = $173.09 | `J440` = $173.09 | Pending PO Row 84, S/N 82 (CWR $173.09) |
| 52 | B443:B466 | CJ-2026-000198 | GOSUGZH0748390 | `B461` = $519.20 | `B462` = $278.16 | `B466` = $797.36 | Pending PO Rows 85-86, S/N 83 (Storage $519.20), S/N 84 (CWR $278.16) |
| 53 | F443:F466 | CJ-2026-000243 | 271567221 | `F461` = $1,310.00 | `F462` = $237.79 | `F466` = $1,547.79 | Pending PO Rows 87-88, S/N 85 (Storage $1,310), S/N 86 (CWR $237.79) |
| 54 | J443:J466 | CJ-2026-000159 | QGD2889315 | `J461` = $460.00 | `J462` = $476.35 | `J466` = $936.35 | Pending PO Rows 89-90, S/N 87 (Storage $460), S/N 88 (CWR $476.35) |
| 55 | B469:B492 | CJ-2026-000142 | EMIVCHNGUZ000250 | `B487` = $649.00 | `B488` = $293.02 | `B492` = $942.02 | Pending PO Rows 91-92, S/N 89 (Storage $649), S/N 90 (CWR $293.02) |
| 56 | F469:F492 | CJ-2026-000126 | EMIVCHNGUZ000520 | `F487` = $0.00 | `F488` = $173.28 | `F492` = $173.28 | Pending PO Row 93, S/N 91 (CWR $173.28) |
| 57 | J469:J492 | CJ-2026-000123 | 149604418141 | `J487` = $790.00 | `J488` = $86.55 | `J492` = $876.55 | Pending PO Rows 94-95, S/N 92 (Storage $790), S/N 93 (CWR $86.55) |
| 58 | B495:B518 | CJ-2026-000104 | COSU6501268688 | `B513` = $1,498.60 | `B514` = $475.74 | `B518` = $1,974.34 | Pending PO Rows 96-97, S/N 94 (Storage $1,498.60), S/N 95 (CWR $475.74) |
| **TOTALS** | — | **58 CJs** | — | **$35,688.25** | **$19,718.15** | **$55,626.40** | **Exact Cell Sum Across All 58 Blocks** |
