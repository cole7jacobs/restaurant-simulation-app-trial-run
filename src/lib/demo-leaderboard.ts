import { demoQ7Key } from './demo'
import type { LeaderboardEntry } from '../../shared/results'

// Fictional sample data. Per-round figures for the five demo teams, Q1 to Q6, copied from the TeamMetrics rows
// in db/seed.demo.sql (Revenue = FoodSales + BeverageSales). Q7 stays empty until the browser-only Q7 import.
const demoTeams = ['Demo Bistro', 'Demo Grill', 'Demo Cafe', 'Demo Kitchen', 'Demo Tavern']
// [firm, round, NetIncome, Revenue, OperatingProfit]
const seeded: [number, number, number, number, number][] = [
  [1, 1, 40126, 983129, 167234],
  [2, 1, 29869, 932301, 150420],
  [3, 1, 29869, 932301, 150420],
  [4, 1, 33010, 953380, 155570],
  [5, 1, 29869, 932301, 150420],
  [1, 2, 43678, 1074566, 172477],
  [2, 2, 13187, 794210, 122491],
  [3, 2, 5330, 811723, 110067],
  [4, 2, 33240, 834080, 155365],
  [5, 2, -16438, 1063814, 81438],
  [1, 3, 49240, 1081722, 180994],
  [2, 3, 24752, 868406, 140848],
  [3, 3, 18633, 866518, 130917],
  [4, 3, 5713, 860619, 109635],
  [5, 3, 25517, 1014062, 138266],
  [1, 4, 42824, 1034387, 169851],
  [2, 4, 21372, 810747, 134685],
  [3, 4, 10884, 833814, 118555],
  [4, 4, 16112, 701610, 126061],
  [5, 4, 5845, 829226, 112641],
  [1, 5, 25932, 999776, 141579],
  [2, 5, 23419, 824536, 137398],
  [3, 5, 27132, 996409, 143485],
  [4, 5, 3103, 614086, 108177],
  [5, 5, -23775, 738730, 77709],
  [1, 6, 32333, 1023348, 151407],
  [2, 6, 25819, 813226, 140667],
  [3, 6, 24274, 941865, 138134],
  [4, 6, 28963, 689463, 138594],
  [5, 6, 9647, 819321, 116555],
]

const entry = (firm: number, RoundNumber: number, NetIncome: number, Revenue: number, OperatingProfit: number): LeaderboardEntry =>
  ({ TeamName: demoTeams[firm - 1], FirmNumber: firm, IsOwn: firm === 1, RoundNumber, NetIncome, Revenue, OperatingProfit })

type StoredFirm = { firm: number; metrics: { FoodSales: number; BeverageSales: number; OperatingProfit: number; NetIncome: number } }

/** Per-round demo rows: Q1 to Q6 plus Q7 for all five firms once the demo import has been confirmed. */
export function demoLeaderboardRows(): LeaderboardEntry[] {
  const rows = seeded.map(([firm, round, ni, revenue, op]) => entry(firm, round, ni, revenue, op))
  try {
    const firms = (JSON.parse(sessionStorage.getItem(demoQ7Key) ?? 'null') as { firms?: StoredFirm[] } | null)?.firms ?? []
    for (const { firm, metrics } of firms) {
      if (firm >= 1 && firm <= 5) rows.push(entry(firm, 7, metrics.NetIncome, metrics.FoodSales + metrics.BeverageSales, metrics.OperatingProfit))
    }
  } catch { /* unreadable storage: show Q1 to Q6 only */ }
  return rows
}
