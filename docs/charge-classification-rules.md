# Charge Classification Rules & Registry

All charge line items imported from `Pending PO` or other operational sheets are parsed and classified using explicit, auditable categorization rules.

---

## 1. Classification Categories

| Category Code | Display Name | Match Keywords / Patterns | Target Summary Bucket | PRD Section |
|---|---|---|---|---|
| `STORAGE` | Storage Charges | Contains "Storage", "Storage Charges", "Demurrage" | `storage amount` | §5.1, §9.2 |
| `CWR` | Custom Warehouse Rent | Contains "Custom Warehouse", "Warehouse Rent", "CWR" | `CWR` | §5.1, §9.2 |
| `REEFER_MONITORING` | Power & Monitoring | Contains "Power and Monitoring", "Reefer", "Plug-in" | `CWR` (or dedicated line) | §2.1 audit findings |
| `LIFT` | Lift On / Lift Off | Contains "Lift On/Off", "LoLo", "Handling" | `CLEARING` | §9.3 |
| `TRANSPORT` | Transport | Contains "Transport", "Haulage", "Trucking", "Freight" | `TRANSPORT` | §9.3 |
| `CLEARING` | Customs Clearing | Contains "Clearing", "Agency", "Documentation" | `CLEARING` | §9.3 |
| `OTHER` | Unclassified / Review | Any unmatched charge description | Review Queue | §9.1 |

---

## 2. Rules Precedence & Ambiguity Handling
1. Exact string matching is attempted first (case-insensitive, trimmed).
2. If exact match fails, normalized pattern matching applies.
3. If multiple categories match or description is ambiguous, system sets category to `OTHER` and flags record with `Unclassified Charge — Review Required`.
4. User can verify or reclassify any charge in the UI with full audit logging.
