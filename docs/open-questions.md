# Open Questions — Restaurant Simulation App

> These questions must be resolved before the indicated phase can be correctly implemented.
> Do not invent values. Obtain confirmed answers from the professor or simulation documentation.

---

## Critical — Block Implementation

### OQ-1 — Exact RFI Input File Format
**Blocks:** Phase 4 (PBI-04, PBI-07, PBI-09)

What is the precise field order, field widths, spacing, line structure, and file naming convention for the RFI input files?

The Data Dictionary references field positions (e.g., "first number on the Operations line") but does not provide a complete format specification or example file.

**Action required:** Obtain at least one sample RFI input file from the professor.

---

### OQ-2 — FR.LST Output File Structure
**Blocks:** Phase 5 (PBI-10, PBI-11)

What are the exact section headers, column positions, firm block delimiters, and data line formats in `FR.LST`?

The Data Dictionary describes the stored fields but includes no example output file.

**Action required:** Obtain at least one sample `FR.LST` output file from the professor.

---

### OQ-3 — Report Flag Field Order on the Operations RFI Line
**Blocks:** Phase 4

The three `0/1` report flags (`ReportGuestSatisfaction`, `ReportFinancial`, `ReportProduct`) appear after the five budget values on the Operations line of the RFI file. The Data Dictionary explicitly notes:

> *"which position maps to which report is unconfirmed (open question to the professor)"*

**Action required:** Confirm the exact position order with the professor.

---

### OQ-4 — Complete Menu Item Catalog
**Blocks:** Phase 3

The `MenuItem` table must be seeded with the complete, authoritative item list before students can enter decisions.

The design system mockup shows: **Steak, Salad bowl, Chicken, Pasta, Veal, Fin fish, Wine, Beer.**

Questions:
- Is this the complete, fixed list? Are there other items?
- Can a team leave any item out freely, or is there a minimum number of items per round?
- Do item names in the database need to match the exact casing used in the FORTRAN files?

**Action required:** Confirm the full item list and naming rules with the professor or the FORTRAN documentation.

---

### OQ-5 — Preparation Level Options Per Item
**Blocks:** Phase 3

The form shows preparation as a dropdown. The mockup includes: Filet, Gourmet, Game Hen, Fresh, Chop, Imported.

Questions:
- Is this list fixed globally, or does it vary per item?
- Are these the only valid values, or are there others?
- Do these map to numeric prep levels 1, 2, 3 (as stored in `PrepLevel`) in a fixed order?

**Action required:** Confirm the full preparation level list and its mapping with the professor.

---

## Non-Critical — Can Default, Revisit Later

### OQ-6 — Round Numbering and Naming
**Noted:** Phase 2

Are rounds numbered 1–7 sequentially? The mockup shows "Round 5 · Winter quarter." Is there a semester/quarter label per round, and who creates rounds — the professor in the app, or is it configured elsewhere?

### OQ-7 — Result Release Workflow
**Noted:** Phase 6

Does the professor explicitly "release" results to students after import, or are results visible immediately after a successful FR.LST import?

### OQ-8 — Multi-Round Decision Carry-Forward
**Noted:** Phase 3

When a new round opens, do prior-round decisions pre-populate as a starting point, or do students always start from a blank form?

### OQ-9 — Professor Account Provisioning
**Noted:** Phase 2

How are professor accounts created? Is there an admin panel, or is a seed/CLI command sufficient for course use?

### OQ-10 — Additional FR.LST Metrics
**Noted:** Phase 6

The `TeamMetrics` table stores 8 columns from FR.LST. Are there additional output fields (labor cost, advertising cost, controllable expenses) that students need to see on the dashboard but are not yet in the schema?
