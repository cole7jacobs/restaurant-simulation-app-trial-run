import type { StudentResults } from '../../shared/results'

// Fictional demonstration figures; they are not live simulation output.
export const demoResults: StudentResults = {
  round: 5,
  metrics: { FoodSales: 786013, BeverageSales: 213763, FoodCost: 232756, BeverageCost: 44493,
    OperatingProfit: 141579, NetIncome: 25932, FoodOrders: 36100, AvgDailyCustomerCount: 407 },
  menu: [{ ResultSlot: 1, DecisionSlot: null, ItemName: 'STEAK', PrepLevel: 3,
    CostOfGoodsSoldPct: 28.7, OrdersSold: 5291, TotalSales: 132010 }],
}
export const demoKey = (round: number) => `sample-slice:demo:decisions:${round}`
export const isDemoPath = (path: string) => path === '/demo' || path.startsWith('/demo/')

export const demoQ7Key = 'sample-slice:demo:results:q7:v1'

export function readDemoQ7(): StudentResults | null {
  try {
    const raw = sessionStorage.getItem(demoQ7Key)
    return raw ? JSON.parse(raw) as StudentResults : null
  } catch { return null }
}
