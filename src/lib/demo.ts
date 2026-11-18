import type { StudentResults } from '../../shared/results'

// Fictional demonstration figures for Demo Bistro, Q1 to Q6, copied from db/seed.demo.sql (Team -1).
// They are not live simulation output. Q7 stays empty until the demo import fills it.
type Row = [item: string, prep: number, cogs: number, orders: number, sales: number]
const round = (n: number, m: number[], rows: Row[]): StudentResults => ({
  round: n,
  metrics: { FoodSales: m[0], BeverageSales: m[1], FoodCost: m[2], BeverageCost: m[3], OperatingProfit: m[4],
    NetIncome: m[5], FoodOrders: m[6], AvgDailyCustomerCount: m[7] },
  menu: rows.map(([ItemName, PrepLevel, CostOfGoodsSoldPct, OrdersSold, TotalSales], i) =>
    ({ ResultSlot: i + 1, DecisionSlot: null, ItemName, PrepLevel, CostOfGoodsSoldPct, OrdersSold, TotalSales })),
})
export const demoRounds: StudentResults[] = [
  round(1, [791227, 191902, 233299, 42201, 167234, 40126, 38340, 396], [
    ['STEAK', 3, 30.3, 9701, 213422], ['CHICKEN', 3, 29.3, 10253, 215313], ['PASTA', 3, 27.1, 10500, 189000],
    ['SHRIMP', 2, 31.4, 7886, 173492], ['WINE', 2, 28.4, 14855, 111413], ['SPIRITS', 2, 13.1, 12383, 80490]]),
  round(2, [859189, 215377, 255928, 41228, 172477, 43678, 40130, 471], [
    ['STEAK', 3, 29.7, 7284, 181736], ['SALAD BOWL', 3, 26.1, 8535, 149363], ['CHICKEN', 3, 29.2, 8552, 186006],
    ['PASTA', 3, 27, 8517, 161397], ['SHRIMP', 3, 36, 7242, 180688], ['WINE', 3, 27.8, 7112, 85344],
    ['BEER', 3, 13.1, 9481, 66367], ['SPIRITS', 3, 13.9, 7074, 63666]]),
  round(3, [875133, 206589, 253668, 32502, 180994, 49240, 39727, 478], [
    ['STEAK', 3, 29.7, 7089, 176941], ['SALAD BOWL', 3, 26.3, 8954, 156695], ['CHICKEN', 3, 29.2, 8764, 190617],
    ['PASTA', 3, 27, 8753, 165869], ['VEAL', 3, 32.1, 6167, 185010], ['WINE', 3, 23.8, 5964, 83496],
    ['BEER', 3, 10.8, 8061, 68519], ['SPIRITS', 3, 9.6, 4198, 54574]]),
  round(4, [816115, 218272, 240648, 45752, 169851, 42824, 36926, 421], [
    ['STEAK', 3, 29.2, 5593, 139545], ['SALAD BOWL', 3, 25.9, 6943, 118031], ['CHICKEN', 3, 29.2, 6703, 145790],
    ['PASTA', 3, 26.1, 6461, 122436], ['VEAL', 3, 32.9, 5222, 146216], ['FIN FISH', 3, 32.3, 6004, 144096],
    ['WINE', 3, 27.8, 10021, 120252], ['BEER', 3, 12.6, 13520, 98020]]),
  round(5, [786013, 213763, 232756, 44493, 141579, 25932, 36100, 407], [
    ['STEAK', 3, 28.7, 5291, 132010], ['SALAD BOWL', 3, 26, 6942, 114543], ['CHICKEN', 3, 29.4, 6663, 141589],
    ['PASTA', 3, 26.3, 6479, 119862], ['VEAL', 3, 33.2, 4966, 139793], ['FIN FISH', 3, 33, 5759, 138216],
    ['WINE', 3, 27.8, 9641, 115692], ['BEER', 3, 12.6, 13527, 98071]]),
  round(6, [809937, 213411, 245304, 44420, 151407, 32333, 36743, 427], [
    ['STEAK', 3, 28.9, 5478, 136676], ['SALAD BOWL', 3, 26.1, 6547, 114573], ['CHICKEN', 3, 30.2, 6899, 146604],
    ['PASTA', 3, 27, 6711, 124154], ['VEAL', 3, 34.1, 5142, 144747], ['FIN FISH', 3, 34.1, 5966, 143184],
    ['WINE', 3, 27.8, 9625, 115500], ['BEER', 3, 12.6, 13505, 97911]]),
]
export const demoKey = (round: number) => `sample-slice:demo:decisions:${round}`
export const isDemoPath = (path: string) => path === '/demo' || path.startsWith('/demo/')

export const demoQ7Key = 'sample-slice:demo:results:q7:v1'

export function readDemoQ7(): StudentResults | null {
  try {
    const raw = sessionStorage.getItem(demoQ7Key)
    return raw ? JSON.parse(raw) as StudentResults : null
  } catch { return null }
}
