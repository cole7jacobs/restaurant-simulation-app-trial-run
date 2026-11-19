import { expect, it } from 'vitest'
import { decisionFields, financeFields, type DecisionValues } from '../../shared/decisions'
import { generateRfi } from '../../worker/rfi'
import { parseListing } from '../../worker/fr-lst'

const q1 = import.meta.glob<string>('../../input-output/00_Q1-simulation-start/output-of-simulation/FR.LST', { eager: true, query: '?raw', import: 'default' })
const q2 = import.meta.glob<string>('../../input-output/01_Q2-decisions/required-by-legacy-simulation/RFI*ME.TXT', { eager: true, query: '?raw', import: 'default' })
const numbers = (line: string) => (line.slice(43).match(/.{10}/g) ?? []).map(Number)

it.skipIf(Object.keys(q1).length === 0)('reads Q1 reference results for all five firms', () => {
  const report = parseListing(Object.values(q1)[0])
  expect(report.round).toBe(1)
  expect(report.firms.map(({ firm }) => firm)).toEqual([1, 2, 3, 4, 5])
})

it.skipIf(Object.keys(q2).length === 0)('maps all Q2 decisions while retaining the approved Finance format', () => {
  expect(Object.keys(q2)).toHaveLength(5)
  for (const [path, source] of Object.entries(q2)) {
    const lines = source.split(/\r?\n/)
    const ops = numbers(lines[18]), finance = numbers(lines[19])
    expect(finance).toEqual(Array(10).fill(0))
    const values = {
      ...Object.fromEntries(decisionFields.slice(0, 5).map(({ key }, index) => [key, ops[index]])),
      ...Object.fromEntries(financeFields.map((key, index) => [key, finance[index]])),
      ReportGuestSatisfaction: ops[5], ReportFinancial: ops[6], ReportProduct: ops[7],
    } as DecisionValues
    const menu = lines.slice(4, 14).filter((line) => line.slice(0, 32).trim()).map((line) => {
      const [PrepLevel, OrderSize, InternalPromotion, SalesPrice] = numbers(line)
      return { ItemName: line.slice(0, 32).trim(), PrepLevel, OrderSize, InternalPromotion, SalesPrice }
    })
    const firm = Number(path.match(/RFI([1-5])ME/)![1])
    const generated = generateRfi(firm, values, menu).content.split('\r\n')
    for (const index of [...Array(19).keys(), 20, 21, 22, 23]) expect(generated[index]).toBe(lines[index])
    expect(generated[19]).toHaveLength(123)
  }
})
