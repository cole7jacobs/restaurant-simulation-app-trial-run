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
