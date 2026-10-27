# Authoritative Formula & Calculation Rules Engine Specification

This specification documents the single authoritative calculation engine utilized across UI, reports, and Excel export.

---

## 1. Date Interval Formulas

### 1.1 DELAYS IN ALLOCATION
- **Formula:** `DelaysInAllocation = AllocationDate - AllocationRequestDate`
- **Excel Representation:** `=IF(OR(B13="",B12=""),"",B13-B12)`
- **Input Preconditions:** Both dates must be valid calendar dates.
- **Null Handling:** If either date is missing, result is `null` (displayed as `—` or empty, NOT `0`).
- **Unit:** Integer calendar days.
- **Negative Values:** If negative, flagged for operator review (e.g. Allocation completed prior to recorded request timestamp).

### 1.2 CLEARANCE
- **Formula:** `Clearance = DODate - DischargeDate`
- **Excel Representation:** `=IF(OR(B8="",B6=""),"",B8-B6)`
- **Input Preconditions:** Delivery Order date and Vessel Discharge date.
- **Null Handling:** If either is missing, result is `null`.
- **Negative Values:** Flagged as invalid operational sequence if DO date precedes discharge date.

### 1.3 CLIENT DELAY
- **Formula:** `ClientDelay = DocsReceivedDate - DischargeDate`
- **Excel Representation:** `=IF(OR(B5="",B6=""),"",B5-B6)`
- **Input Preconditions:** Documents Received Date and Vessel Discharge Date.
- **Negative Values:** Legitimate operational negative values preserved (e.g. `-11` indicates documents were received 11 days *before* vessel discharge, signifying zero client delay).

---

## 2. Financial Aggregation Formulas

### 2.1 Storage Amount
- **Formula:** `StorageAmount = SUM(eligible Pending PO line items where classification == 'STORAGE')`
- **Traceability:** Every cent is linked back to `Pending PO` row ID.

### 2.2 Custom Warehouse Rent (CWR)
- **Formula:** `CWRAmount = SUM(eligible Pending PO line items where classification in ('CWR', 'REEFER_MONITORING'))`
- **Currency Conversion Rule:** When amounts are entered as TZS formulas e.g. `(460155)/2600`, the evaluated USD value is stored with exact floating point precision and rendered formatted to 2 decimal places.

### 2.3 Client Total
- **Formula:** `ClientTotal = StorageAmount + CWRAmount + TransportTotal + ClearingTotal`
- **Excel Representation:** `=SUM(B19:B20)` (or `=S2+T2`)
- **Rounding:** Displayed with standard two decimal places, internal unrounded precision maintained.
