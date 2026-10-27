# Source Matching & Processing Status Rules

This document specifies the rules governing cross-sheet reconciliation between `Pending PO`, `Report`, `Billed`, and `QUERIED`.

---

## 1. Matching Hierarchy & Conflict Detection

When ingesting or linking records:

### 1.1 Identifier Normalization
- **CJ Format Normalization:** Strip extraneous spaces and extract the standardized CJ code: `CJ-YYYY-XXXXXX` (e.g. `CJ-2026-000091`).
- **BL Number Normalization:** Remove spaces, hyphens, and convert to uppercase. Preserve original text for audit.

### 1.2 Shipment Linking Rules
1. **Primary Match:** Search `Report` for matching `FileNo` (normalized CJ).
2. **Secondary Match:** Search `Report` for matching `BillofLading` (normalized BL).
3. **Conflict Flagging:** If CJ resolves to Report record A, but BL resolves to Report record B, do NOT merge. Flag with `Identifier Conflict: CJ and BL point to distinct shipments`.
4. **Ambiguity Flagging:** If multiple rows in `Report` share the same CJ and BL (e.g. multi-container shipment), link container-level details to the corresponding container row.

---

## 2. Charge-Level Processing Status Engine

Statuses are tracked strictly per charge line item:

| Status Code | Label | Transition Triggers & Evidence |
|---|---|---|
| `PENDING` | Pending | Default state for new Pending PO entries without PO number |
| `IN_REVIEW` | In Review | Ambiguous match, unclassified charge, or conflict detected |
| `BILLED` | Billed | Matched in `Billed` sheet with verified PO No. and matching amount |
| `QUERIED` | Queried | Matched in `QUERIED` sheet with dispute reason logged in comments |
| `RESOLVED` | Resolved | Operator verified and resolved query with audit trail |

### Charge-Level Independence (Non-Negotiable)
- **Rule:** A CJ appearing in `Billed` does NOT automatically mark all charges for that CJ as Billed.
- **Example:** For CJ-2026-000134, two charges were queried while another was pending. Each line retains its own independent status, PO assignment, and dispute notes.
