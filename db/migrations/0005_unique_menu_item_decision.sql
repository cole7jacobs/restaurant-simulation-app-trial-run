-- A team may enter the same item twice only with different preparations.
-- Step 1: result rows must not point at decision rows that are about to be removed.
-- Duplicates are every row except the lowest SlotNumber for its (team, round, item, preparation).
UPDATE MenuItemResult
SET DecisionSlot = NULL
WHERE DecisionSlot IS NOT NULL AND EXISTS (
  SELECT 1 FROM MenuItemDecision d
  WHERE d.TeamID = MenuItemResult.TeamID
    AND d.RoundNumber = MenuItemResult.RoundNumber
    AND d.SlotNumber = MenuItemResult.DecisionSlot
    AND d.SlotNumber > (
      SELECT MIN(k.SlotNumber) FROM MenuItemDecision k
      WHERE k.TeamID = d.TeamID AND k.RoundNumber = d.RoundNumber
        AND k.MenuItemID = d.MenuItemID AND k.PrepLevel = d.PrepLevel
    )
);

-- Step 2: delete the duplicates, keeping the lowest SlotNumber.
DELETE FROM MenuItemDecision
WHERE SlotNumber > (
  SELECT MIN(k.SlotNumber) FROM MenuItemDecision k
  WHERE k.TeamID = MenuItemDecision.TeamID AND k.RoundNumber = MenuItemDecision.RoundNumber
    AND k.MenuItemID = MenuItemDecision.MenuItemID AND k.PrepLevel = MenuItemDecision.PrepLevel
);

-- Step 3: enforce the rule going forward.
CREATE UNIQUE INDEX MenuItemDecisionUniqueItemPrep
  ON MenuItemDecision (TeamID, RoundNumber, MenuItemID, PrepLevel);
