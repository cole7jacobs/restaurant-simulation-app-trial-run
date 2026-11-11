import { expect, it } from 'vitest'
import { financeFields, type DecisionValues } from '../../shared/decisions'
import { formatFinanceRecord } from '../../worker/rfi-finance'
import fixtures from '../fixtures/rfi-finance.json'

type FinanceValues = Pick<DecisionValues, typeof financeFields[number]>

it.each(fixtures)('matches the Finance layout in $source', ({ record }) => {
  const amounts = financeFields.map((field, index) =>
    [field, Number(record.slice(43 + index * 10, 53 + index * 10))],
  )
  // The originals retain signed negative zero. New output uses the approved +0.
  const expected = record.replace(/-0(?= +[+\d-]|\r\n)/g, '+0')
  const generated = formatFinanceRecord(Object.fromEntries(amounts) as FinanceValues)
  expect(record).toHaveLength(125)
  expect(generated).toBe(expected)
})

it.each([1.25, 1_000_000_000, -1_000_000_000, null])('rejects an unrepresentable Finance amount of %s', (amount) => {
  expect(() => formatFinanceRecord({
    TimeDepositChange: amount, CertificateOfDepositChange: 0, NotePayableChange: 0,
  })).toThrow(RangeError)
})
