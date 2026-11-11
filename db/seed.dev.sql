-- DEVELOPMENT ONLY. Fictional fixtures, including all decision and result values.
-- Reserved negative team IDs keep fixture teams distinct from generated IDs.
INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES
  (-1, 'Demo Bistro', 1),
  (-2, 'Demo Grill', 2),
  (-3, 'Demo Cafe', 3),
  (-4, 'Demo Kitchen', 4),
  (-5, 'Demo Tavern', 5)
ON CONFLICT DO NOTHING;

WITH rounds (RoundNumber, SubmittedAt) AS (
  VALUES (1, '2026-11-01T18:00:00Z'), (2, NULL)
)
INSERT INTO TeamDecision (TeamID, RoundNumber, SubmittedAt, StaffPerDay, HourlyCompensation)
SELECT TeamID, RoundNumber, SubmittedAt, 12, 14.50
FROM Team CROSS JOIN rounds
WHERE TeamID = -1 AND TeamName = 'Demo Bistro' AND FirmNumber = 1
ON CONFLICT (TeamID, RoundNumber) DO NOTHING;

INSERT INTO MenuItemDecision
  (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice)
SELECT TeamID, RoundNumber, 1, MenuItemID, 1, 180, 20, 24.95
FROM TeamDecision
JOIN Team USING (TeamID)
CROSS JOIN MenuItem
WHERE TeamID = -1 AND TeamName = 'Demo Bistro' AND FirmNumber = 1
  AND RoundNumber IN (1, 2) AND Revision = ''
  AND ItemName = 'STEAK' AND OrderSizeUnit = 'Gm.'
  AND NOT EXISTS (
    SELECT 1 FROM MenuItemDecision existing
    WHERE existing.TeamID = TeamDecision.TeamID AND existing.RoundNumber = TeamDecision.RoundNumber
  )
ON CONFLICT (TeamID, RoundNumber, SlotNumber) DO NOTHING;

INSERT INTO TeamMetrics
  (TeamID, RoundNumber, FoodSales, BeverageSales, FoodCost, BeverageCost,
   OperatingProfit, NetIncome, FoodOrders, AvgDailyCustomerCount)
SELECT TeamID, 1, 2400, 800, 900, 260, 440, 350, 110, 25
FROM Team
WHERE TeamID = -1 AND TeamName = 'Demo Bistro' AND FirmNumber = 1
ON CONFLICT (TeamID, RoundNumber) DO NOTHING;
