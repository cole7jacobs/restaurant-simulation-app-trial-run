# FR.LST import specification

A professor selects Q1–Q7 and uploads a nonempty ASCII `.LST` file up to
256 KiB. The importer accepts CRLF or LF and a final DOS EOF byte. The
administrator summary must identify the selected period. Each of firms 1–5
must have one primary statement for that period, and the final firm roster
must be present. The parser locates the primary statement using the
`SALES * ASSETS` heading within a firm block. Later reports repeat firm
headers and are outside the primary statement.

The parser reads the printed left-side income statement amounts for food
sales, beverage sales, food cost, beverage cost, operating profit, and net
income. It reads food orders and average daily customer count from the
operating statistics row. The menu table identifies each selection by item,
preparation, portion unit, promotion, and price. Results retain the printed
COGS percentage, orders sold, and total sales, including negative financial
values. No figures are calculated from other rows.

Preview maps the five firms to `Team.FirmNumber` and shows all team metrics,
menu results, and warnings. Validation failures reject the entire file.
Confirmation uploads the same bytes and checks a token derived from the file
and current round data. A different file for an existing round requires an
explicit replacement selection. An identical file is a no-op. If the firm
assignments changed after an earlier import, restore them before replacing
that round. Writes run in one D1 batch and affect the five mapped teams in
the selected round.

Migration `0004` adds two tables. `SimulationResultImport` records the source
SHA-256, team mapping, timestamp, and write identifier for the latest import
of each round. `MenuItemResult` stores each printed menu row by team, round,
and result position, with an optional link to a submitted decision slot.
The importer links a complete matching ordered menu or a unique match on
item, preparation, portion, promotion, and price. Baseline or unmatched
rows remain available with a warning. Student decisions and their existing
result columns are preserved. Aggregate results use the existing
`TeamMetrics` table. The authenticated student endpoint
`GET /api/student/results/:round` returns the assigned team's imported
metrics and menu rows for the future dashboard.

The raw fixtures cover Q1–Q5 and Q7. The archive has a Q6 PDF report and no
raw Q6 listing. The importer supports a Q6 listing in the same format.
The parser expects the five-firm archive layout and the known catalog and
preparation labels. Optional survey and historical sections are outside the
current dashboard fields. The reports also print total sales, gross profit,
payroll, advertising and promotion, controllable expenses, and balance sheet
figures. Consider adding printed totals and expense breakdowns when the
dashboard requirements call for them. Independently rounded figures should
be stored from the listing if added.
