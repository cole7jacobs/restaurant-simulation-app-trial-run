import { expect, it } from 'vitest'
import { parseListing } from '../../worker/fr-lst'

const archives = import.meta.glob<string>(
  '../../input-output/*/output-of-simulation/FR.LST',
  { eager: true, query: '?raw', import: 'default' },
)
const files = Object.entries(archives)

it('rejects text that lacks the administrator summary', () => {
  expect(() => parseListing('invalid listing')).toThrow(/administrator summary/i)
})

if (!files.length) {
  it.skip('checks the six local archived listings', () => {})
} else {
  it('extracts the 30 firm statements and 200 menu rows', () => {
    const reports = files.map(([, file]) => parseListing(file))
    expect(reports.map(({ round }) => round).sort()).toEqual([1, 2, 3, 4, 5, 7])
    expect(reports.flatMap(({ firms }) => firms).flatMap(({ menu }) => menu)).toHaveLength(200)
  })

  const q5 = files.find(([path]) => path.includes('Q5'))![1]
  it('extracts printed Q5 amounts, counts, negative income, and distinct Steak preparations', () => {
    const { firms } = parseListing(q5)
    expect(firms[0].metrics).toEqual({
      FoodSales: 786013, BeverageSales: 213763, FoodCost: 232756, BeverageCost: 44493,
      OperatingProfit: 141579, NetIncome: 25932, FoodOrders: 36100, AvgDailyCustomerCount: 407,
    })
    expect(firms[0].menu[0]).toMatchObject({
      ItemName: 'STEAK', PrepLevel: 3, CostOfGoodsSoldPct: 28.7, OrdersSold: 5291, TotalSales: 132010,
    })
    expect(firms[1].menu.filter(({ ItemName }) => ItemName === 'STEAK').map(({ PrepLevel }) => PrepLevel)).toEqual([1, 2])
    expect(firms[4].metrics.NetIncome).toBe(-23775)
  })

  it.each([
    ['missing financial line', (source: string) => source.replace('Food Sales                 786013.', 'Unknown line               786013.'), /Food Sales/],
    ['malformed number', (source: string) => source.replace('786013.               78.62', '*******               78.62'), /invalid numeric/],
    ['malformed menu', (source: string) => source.replace('28.7 %      5291.', '**** %      5291.'), /menu row/],
    ['invalid firm', (source: string) => source.replace('Firm  1                                                Firm 1', 'Firm  9                                                Firm 1'), /firm 9/],
    ['duplicate firm', (source: string) => source.replace('Firm  2                                                Firm 2', 'Firm  1                                                Firm 2'), /duplicate.*firm 1/i],
    ['truncation', (source: string) => source.slice(0, -300), /roster/],
  ] as const)('rejects %s', (_name, mutate, expected) => {
    expect(() => parseListing(mutate(q5))).toThrow(expected)
  })
}
