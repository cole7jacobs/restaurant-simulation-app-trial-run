ALTER TABLE TeamDecision ADD COLUMN Revision TEXT NOT NULL DEFAULT '';

CREATE TABLE MenuItemDecisionOrdered (
  -- Composite primary key: one row per (team, round, slot).
  TeamID      INTEGER NOT NULL,
  RoundNumber INTEGER NOT NULL,
  SlotNumber  INTEGER NOT NULL CHECK (SlotNumber >= 1),
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

  PRIMARY KEY (TeamID, RoundNumber, SlotNumber),
  -- Composite foreign key ensures the (team, round) pair has a TeamDecision row.
  FOREIGN KEY (TeamID, RoundNumber) REFERENCES TeamDecision(TeamID, RoundNumber)
) STRICT;

INSERT INTO MenuItemDecisionOrdered (
  TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize,
  InternalPromotion, SalesPrice, CostOfGoodsSoldPct, OrdersSold, TotalSales
)
SELECT TeamID, RoundNumber,
  ROW_NUMBER() OVER (PARTITION BY TeamID, RoundNumber ORDER BY MenuItemID),
  MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice,
  CostOfGoodsSoldPct, OrdersSold, TotalSales
FROM MenuItemDecision;

DROP TABLE MenuItemDecision;
ALTER TABLE MenuItemDecisionOrdered RENAME TO MenuItemDecision;

INSERT INTO MenuItem (ItemName, OrderSizeUnit) VALUES
  ('STEAK', 'Gm.'), ('ROAST BEEF', 'Gm.'), ('CHICKEN', 'Gm.'),
  ('VEAL', 'Gm.'), ('PASTA', 'Gm.'), ('FIN FISH', 'Gm.'),
  ('SHRIMP', 'Gm.'), ('SALAD BOWL', 'Gm.'), ('PORK', 'Gm.'),
  ('PIZZA', 'Gm.'), ('BEER', 'Cl.'), ('WINE', 'Cl.'), ('SPIRITS', 'Cl.')
ON CONFLICT (ItemName) DO NOTHING;
