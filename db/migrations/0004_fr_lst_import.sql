CREATE TABLE SimulationResultImport (
  RoundNumber INTEGER PRIMARY KEY,
  FileHash TEXT NOT NULL,
  TeamMapping TEXT NOT NULL,
  ImportedAt TEXT NOT NULL,
  WriteID TEXT NOT NULL
) STRICT;

-- Printed output is independent of student choices, including the Q1 baseline.
CREATE TABLE MenuItemResult (
  TeamID INTEGER NOT NULL,
  RoundNumber INTEGER NOT NULL,
  ResultSlot INTEGER NOT NULL CHECK (ResultSlot BETWEEN 1 AND 10),
  MenuItemID INTEGER NOT NULL REFERENCES MenuItem(MenuItemID),
  PrepLevel INTEGER NOT NULL CHECK (PrepLevel BETWEEN 1 AND 3),
  DecisionSlot INTEGER,
  CostOfGoodsSoldPct REAL NOT NULL,
  OrdersSold INTEGER NOT NULL CHECK (OrdersSold >= 0),
  TotalSales REAL NOT NULL,
  PRIMARY KEY (TeamID, RoundNumber, ResultSlot),
  FOREIGN KEY (TeamID, RoundNumber) REFERENCES TeamMetrics(TeamID, RoundNumber),
  FOREIGN KEY (TeamID, RoundNumber, DecisionSlot)
    REFERENCES MenuItemDecision(TeamID, RoundNumber, SlotNumber)
) STRICT;
