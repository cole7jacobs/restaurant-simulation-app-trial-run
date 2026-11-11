-- ============================================================
-- Restaurant Simulation App — Canonical Database Schema
-- Source: ISDS 4125 Project Data Dictionary (v1, 2026-10-30)
-- ============================================================
--
-- Six tables as defined in the Data Dictionary.
-- SQLite-specific notes:
--   · BOOLEAN fields stored as INTEGER (0 or 1); SQLite has no native boolean type.
--   · DECIMAL(n,m) fields stored as REAL (64-bit IEEE 754 float).
--     Financial rounding must be applied in the application layer before storage
--     to match FR.LST's printed precision.
--   · AUTOINCREMENT prevents primary key reuse on delete.
--   · D1 enforces foreign keys automatically.
--   · STRICT tables enforce the SQLite storage types declared below.
-- ============================================================

-- ── Table 1: Team ─────────────────────────────────────────────────────────────

CREATE TABLE Team (
  TeamID      INTEGER PRIMARY KEY AUTOINCREMENT,
  TeamName    TEXT    NOT NULL,

  -- Firm identifier used by the legacy FORTRAN simulation (1–5 per supplied samples).
  -- NULL until the professor assigns it. Unique when filled.
  FirmNumber  INTEGER UNIQUE
) STRICT;

-- ── Table 2: User ─────────────────────────────────────────────────────────────

CREATE TABLE User (
  UserID       INTEGER PRIMARY KEY AUTOINCREMENT,
  Email        TEXT    NOT NULL UNIQUE,

  -- Hashed password (bcrypt / argon2). The plaintext password is never stored.
  PasswordHash TEXT    NOT NULL,

  -- Full name in a single field (as specified in the Data Dictionary).
  Name         TEXT    NOT NULL,

  -- 'student' or 'professor'. Application enforces the allowed values.
  Role         TEXT    NOT NULL CHECK(Role IN ('student', 'professor')),

  -- The student's team. NULL for professor accounts.
  -- Application enforces that every student has exactly one team.
  TeamID       INTEGER REFERENCES Team(TeamID)
) STRICT;

-- ── Table 3: TeamDecision ─────────────────────────────────────────────────────

CREATE TABLE TeamDecision (
  -- Composite primary key: one decision row per (team, round).
  TeamID      INTEGER NOT NULL REFERENCES Team(TeamID),
  RoundNumber INTEGER NOT NULL,

  -- NULL = decisions are a draft; ISO 8601 timestamp when the team submits.
  SubmittedAt TEXT,

  -- Operations: RFI input line fields (positions per Data Dictionary)
  StaffPerDay             REAL CHECK (StaffPerDay >= 0),    -- >= 0; first value on the Operations line
  HourlyCompensation      REAL CHECK (HourlyCompensation >= 0),    -- >= 0; second value
  AmenitiesPerOrder       REAL CHECK (AmenitiesPerOrder >= 0),    -- >= 0; third value
  EntertainmentBudget     INTEGER CHECK (EntertainmentBudget >= 0), -- >= 0; fourth value
  MaintenanceBudget       INTEGER CHECK (MaintenanceBudget >= 0), -- >= 0; fifth value

  -- Management info: three 0/1 report flags after the budgets.
  -- OPEN QUESTION OQ-3: exact field-to-report mapping not yet confirmed.
  ReportGuestSatisfaction INTEGER CHECK (ReportGuestSatisfaction IN (0, 1)), -- 0 or 1
  ReportFinancial         INTEGER CHECK (ReportFinancial IN (0, 1)), -- 0 or 1
  ReportProduct           INTEGER CHECK (ReportProduct IN (0, 1)), -- 0 or 1

  -- Finance: plus = increase, minus = decrease (all values may be negative).
  TimeDepositChange          REAL, -- first value on the Finance line
  CertificateOfDepositChange REAL, -- second value
  NotePayableChange          REAL, -- third value

  PRIMARY KEY (TeamID, RoundNumber)
) STRICT;

-- ── Table 4: MenuItem ─────────────────────────────────────────────────────────

-- Catalog of available menu items.
-- OPEN QUESTION OQ-4: complete item list and OQ-5: prep level options
-- must be confirmed before using an authoritative catalog (Phase 3).
CREATE TABLE MenuItem (
  MenuItemID    INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Item name as it appears in the simulation files (e.g. 'STEAK', 'SALAD BOWL').
  -- Unique so it can serve as a stable reference.
  ItemName      TEXT NOT NULL UNIQUE,

  -- Unit of the portion size as printed in FR.LST: 'Gm.' for food, 'Cl.' for drinks.
  OrderSizeUnit TEXT NOT NULL CHECK (OrderSizeUnit IN ('Gm.', 'Cl.'))
) STRICT;

-- ── Table 5: MenuItemDecision ─────────────────────────────────────────────────

CREATE TABLE MenuItemDecision (
  -- Composite primary key: one row per (team, round, item).
  TeamID      INTEGER NOT NULL,
  RoundNumber INTEGER NOT NULL,
  MenuItemID  INTEGER NOT NULL REFERENCES MenuItem(MenuItemID),

  -- Decision fields (required; entered by students in Phase 3)
  PrepLevel         INTEGER NOT NULL CHECK (PrepLevel IN (1, 2, 3)), -- 1, 2, or 3 (plain integer as in RFI input)
  OrderSize         REAL    NOT NULL CHECK (OrderSize >= 0), -- grams (food) or centiliters (drinks); >= 0
  InternalPromotion INTEGER NOT NULL CHECK (InternalPromotion >= 0), -- whole dollars; >= 0
  SalesPrice        REAL    NOT NULL CHECK (SalesPrice >= 0), -- price per order; >= 0

  -- Result fields — NULL until FR.LST is imported for this round (Phase 5)
  CostOfGoodsSoldPct REAL,    -- COGS% as printed in FR.LST (stored as-is; not recomputed)
  OrdersSold         INTEGER, -- number of orders sold in the round
  TotalSales         REAL,    -- total sales for the item in dollars (stored as printed)

  PRIMARY KEY (TeamID, RoundNumber, MenuItemID),
  -- Composite foreign key ensures the (team, round) pair has a TeamDecision row.
  FOREIGN KEY (TeamID, RoundNumber) REFERENCES TeamDecision(TeamID, RoundNumber)
) STRICT;

-- ── Table 6: TeamMetrics ──────────────────────────────────────────────────────

-- Aggregate results imported from FR.LST per (team, round).
-- Values are produced by the FORTRAN simulation; the application does not compute them.
-- Firm N in FR.LST is matched to a team through Team.FirmNumber.
CREATE TABLE TeamMetrics (
  -- Composite primary key: one result row per (team, round).
  TeamID      INTEGER NOT NULL REFERENCES Team(TeamID),
  RoundNumber INTEGER NOT NULL,

  -- SALES section of the income statement
  FoodSales     REAL NOT NULL,
  BeverageSales REAL NOT NULL,

  -- COST OF SALES section
  FoodCost      REAL NOT NULL,
  BeverageCost  REAL NOT NULL,

  -- Derived lines (stored as printed in FR.LST; not recomputed from other stored fields
  -- because each printed line is independently rounded and may differ by up to $2).
  OperatingProfit REAL NOT NULL,
  NetIncome       REAL NOT NULL,

  -- Statistics line printed above each firm's income statement in FR.LST
  FoodOrders            INTEGER NOT NULL,
  AvgDailyCustomerCount INTEGER NOT NULL,

  PRIMARY KEY (TeamID, RoundNumber)
) STRICT;
