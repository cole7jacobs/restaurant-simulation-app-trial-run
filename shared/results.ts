export const importRounds = [1, 2, 3, 4, 5, 6, 7]
export const maxListingSize = 256 * 1024

export const metricFields = [
  'FoodSales', 'BeverageSales', 'FoodCost', 'BeverageCost',
  'OperatingProfit', 'NetIncome', 'FoodOrders', 'AvgDailyCustomerCount',
] as const

export type TeamResults = Record<typeof metricFields[number], number>
export type MenuResult = {
  ItemName: string
  PrepLevel: number
  OrderSize: number
  OrderSizeUnit: string
  InternalPromotion: number
  SalesPrice: number
  CostOfGoodsSoldPct: number
  OrdersSold: number
  TotalSales: number
}

// Response of GET /api/student/results/:round. Menu rows carry only the stored result columns.
export type StudentMenuResult = Pick<
  MenuResult, 'ItemName' | 'PrepLevel' | 'CostOfGoodsSoldPct' | 'OrdersSold' | 'TotalSales'
> & { ResultSlot: number; DecisionSlot: number | null }
export type StudentResults = { round: number; metrics: TeamResults; menu: StudentMenuResult[] }

// Response of GET /api/student/leaderboard: cumulative totals over imported rounds, best net income first.
export type LeaderboardEntry = {
  TeamName: string
  FirmNumber: number | null
  IsOwn: boolean
  NetIncome: number
  Revenue: number
  OperatingProfit: number
}
export type Leaderboard = { teams: LeaderboardEntry[] }

export type ImportPreview = {
  round: number
  token: string
  alreadyImported: boolean
  replacesResults: boolean
  warnings: string[]
  teams: {
    TeamID: number
    TeamName: string
    FirmNumber: number
    metrics: TeamResults
    menu: (MenuResult & { DecisionSlot: number | null })[]
  }[]
}
