import { expect, it } from 'vitest'
import { decisionFields, financeFields, type DecisionValues } from '../../shared/decisions'
import { generateRfi } from '../../worker/rfi'

const originals = import.meta.glob<string>(
  '../../input-output/*_Q[567]-decisions/required-by-legacy-simulation/RFI*.TXT',
  { eager: true, query: '?raw', import: 'default' },
)

function numbers(record: string) {
  return record.slice(43).match(/.{10}/g)!.map(Number)
}

const values: DecisionValues = {
  StaffPerDay: 27, HourlyCompensation: 16.5, AmenitiesPerOrder: 1.5,
  EntertainmentBudget: 13000, MaintenanceBudget: 16000,
  ReportGuestSatisfaction: 1, ReportFinancial: 1, ReportProduct: 0,
  TimeDepositChange: 2500, CertificateOfDepositChange: 0, NotePayableChange: 2500,
}
const selection = { ItemName: 'STEAK', PrepLevel: 3, OrderSize: 170, InternalPromotion: 1750, SalesPrice: 24.95 }

it('generates the expected filename and fixed-width records', () => {
  const { filename, content } = generateRfi(2, values, [selection, { ...selection, PrepLevel: 1 }])
  const lines = content.split('\r\n')
  expect(filename).toBe('RFI2ME.TXT')
  expect(lines.map((line) => line.length)).toEqual([
    0, 0, 0, 96, 103, 103, 93, 93, 93, 93, 93, 93, 93, 93, 143, 143, 93, 93, 143, 123, 63, 63, 63, 63, 0, 0,
  ])
  expect(lines[4].slice(32, 53).trim().split(/ +/)).toEqual(['Filet', '3'])
  expect(lines[5].slice(32, 53).trim().split(/ +/)).toEqual(['Burger', '1'])
  expect(numbers(lines[18])).toEqual([27, 16.5, 1.5, 13000, 16000, 1, 1, 0, 0, 12000])
  expect(numbers(lines[19])).toEqual([2500, 0, 2500, 0, 0, 0, 0, 0])
  expect(lines.join('')).not.toMatch(/[\r\n]/)
})

it('rejects incomplete or unsupported decisions', () => {
  expect(() => generateRfi(null, values, [selection])).toThrow('firm number')
  expect(() => generateRfi(1, values, [])).toThrow('menu selections')
  expect(() => generateRfi(1, { ...values, StaffPerDay: null }, [selection])).toThrow('Staff FTEs')
  expect(() => generateRfi(1, { ...values, ReportProduct: 1 }, [selection])).toThrow('Product report')
  expect(() => generateRfi(1, values, [{ ...selection, PrepLevel: 4 }])).toThrow('preparation')
  expect(() => generateRfi(1, values, [{ ...selection, SalesPrice: 1.001 }])).toThrow('price')
})

if (Object.keys(originals).length === 0) {
  it.skip('compares all 15 local Q5–Q7 RFI reference files', () => {})
} else {
  it('finds all 15 local Q5–Q7 files', () => expect(Object.keys(originals)).toHaveLength(15))
  it.each(Object.entries(originals))('matches the archived bytes in %s', (path, source) => {
    const lines = source.split('\r\n')
    const ops = numbers(lines[18])
    const finance = numbers(lines[19])
    const input = {
      ...Object.fromEntries(decisionFields.slice(0, 5).map(({ key }, index) => [key, ops[index]])),
      ...Object.fromEntries(financeFields.map((key, index) => [key, finance[index]])),
      ReportGuestSatisfaction: ops[5], ReportFinancial: ops[6], ReportProduct: ops[7],
    } as DecisionValues
    const menu = lines.slice(4, 14).filter((line) => line.slice(0, 32).trim()).map((line) => {
      const [PrepLevel, OrderSize, InternalPromotion, SalesPrice] = numbers(line)
      return { ItemName: line.slice(0, 32).trim(), PrepLevel, OrderSize, InternalPromotion, SalesPrice }
    })
    const filename = path.split('/').pop()!
    const output = generateRfi(Number(filename[3]), input, menu)
    expect(output.filename).toBe(filename)
    lines[19] = lines[19].replace(/-0(?= )/g, '+0')
    expect(output.content).toBe(lines.join('\r\n'))
  })
}
