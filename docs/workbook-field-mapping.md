# 24-Field Workbook Mapping & Data Schema

This document details the authoritative field specifications, source mappings, data types, and UI representations for all 24 fields required by the PRD and workbook.

| No. | Field Name | Label in Summary / Sheets | Data Type | Primary Source | Secondary / Fallback Source | Editable / Calculated | Provenance Tag |
|---|---|---|---|---|---|---|---|
| 1 | FILE | `FILE` | String (Identifier) | `Pending PO` / `Report.FileNo` | Manual Entry | Editable (ID) | `Pending PO — source row` / `Report — matched by CJ` |
| 2 | BL | `BL` | String (Identifier) | `Pending PO` / `Report.BillofLading` | Manual Entry | Editable (ID) | `Pending PO — source row` / `Report — matched by BL` |
| 3 | Size | `Size` | String (e.g. "40FT", "20FT") | `Report.Size` | Manual Entry | Editable | `Report — matched by CJ` |
| 4 | ShippingLine | `ShippingLine` | String (e.g. "RAIS", "MAERSK") | `Report.ShippingLine` | Manual Entry | Editable | `Report — matched by CJ` |
| 5 | DOCS RECEIVED DATE | `DOCS RECEIVED DATE` | Date (YYYY-MM-DD) | `Report.Documents Rec date` | Manual Entry | Editable | `Report — matched by CJ` |
| 6 | DischargeDate | `DischargeDate` | Date (YYYY-MM-DD) | `Report.DischargeDate` | Manual Entry | Editable | `Report — matched by CJ` |
| 7 | CarryIn Date | `CarryIn Date` | Date (YYYY-MM-DD) | `Report.CarryIn Date` | Manual Entry | Editable | `Report — matched by CJ` |
| 8 | DODate | `DODate` | Date (YYYY-MM-DD) | `Report.DODate` | Manual Entry | Editable | `Report — matched by CJ` |
| 9 | AssessmentNotice | `AssessmentNotice` | Date (YYYY-MM-DD) | `Report.AssessmentNotice` | Manual Entry | Editable | `Report — matched by CJ` |
| 10 | ReleaseOrderPrintDate | `ReleaseOrderPrintDate` | Date (YYYY-MM-DD) | `Report.ReleaseOrderPrintDate` | Manual Entry | Editable | `Report — matched by CJ` |
| 11 | PortCharges | `PortCharges` | Date (YYYY-MM-DD) | `Report.PortCharges` | Manual Entry | Editable | `Report — matched by CJ` |
| 12 | Allocation request date | `Allocation request  date` | Date (YYYY-MM-DD) | `Report.Allocation request date` | Manual Entry | Editable | `Report — matched by CJ` |
| 13 | allocation date | `allocation date` | Date (YYYY-MM-DD) | `Report.allocation date` | Manual Entry | Editable | `Report — matched by CJ` |
| 14 | DELAYS IN ALLOCATION | `DELAYS IN ALLOCATION` | Integer (Days) | Calculated | Formula Engine | **Calculated** (`allocation date` - `Allocation request date`) | `Calculated — formula v1.0` |
| 15 | Truck Number | `Truck Number` | String | `Report.Truck Number` | Manual Entry | Editable | `Report — matched by CJ` |
| 16 | LOADED | `LOADED` / `LoadDate` | Date (YYYY-MM-DD) | `Report.LoadDate` or `Report.Status` | Manual Entry | Editable | `Report — matched by CJ` |
| 17 | CLEARANCE | `CLEARANCE` | Integer (Days) | Calculated | Formula Engine | **Calculated** (`DODate` - `DischargeDate`) | `Calculated — formula v1.0` |
| 18 | CLIENT DELAY | `CLIENT DELAY` | Integer (Days) | Calculated | Formula Engine | **Calculated** (`DOCS RECEIVED DATE` - `DischargeDate`) | `Calculated — formula v1.0` |
| 19 | storage amount | `storage amount` | Decimal (USD) | `Pending PO` | Aggregated | **Calculated** (Sum of eligible Storage charges for CJ) | `Pending PO — aggregated` |
| 20 | CWR | `CWR` | Decimal (USD) | `Pending PO` | Aggregated | **Calculated** (Sum of eligible CWR charges for CJ) | `Pending PO — aggregated` |
| 21 | COMMENTS | `COMMENTS` | Text | `Pending PO.COMMENT` / `Report.COMMENTS` | Manual Entry | Editable | `Pending PO` / `Manual entry` |
| 22 | TRANSPORT TOTAL | `TRANSPORT` | Decimal (USD) | `Pending PO` | Transport rule | **Calculated** (Default 0.00 unless transport charges present) | `Calculated — formula v1.0` |
| 23 | CLEARING TOTAL | `CLEARING ` | Decimal (USD) | `Pending PO` | Clearing rule | **Calculated** (Default 0.00 unless clearing charges present) | `Calculated — formula v1.0` |
| 24 | CLIENT TOTAL | `CLIENT TOTAL` | Decimal (USD) | Calculated | Formula Engine | **Calculated** (`storage amount` + `CWR` + `TRANSPORT` + `CLEARING`) | `Calculated — formula v1.0` |

### Special Field Findings Confirmed in Audit:
1. **PortCharges is Confirmed as a Date:** In `Report` column 23, `Sheet1` column 11, `Sheet2` column 11, and ` REPORTS SUMMARY` row 11, `PortCharges` holds ISO dates (e.g. `2026-07-22`), not currency.
2. **DELAYS IN ALLOCATION:** Exact Excel formula is `=IF(OR(alloc="",req=""),"",alloc-req)`.
3. **CLEARANCE:** Exact Excel formula is `=IF(OR(DODate="",DischargeDate=""),"",DODate-DischargeDate)`.
4. **CLIENT DELAY:** Exact Excel formula is `=IF(OR(Docs="",Discharge=""),"",Docs-Discharge)`. Can yield negative values if documents were received before vessel discharge.
5. **CLIENT TOTAL:** Sums `storage amount` and `CWR`.
