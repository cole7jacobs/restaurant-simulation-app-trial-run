import { financeFields, type DecisionValues } from '../shared/decisions'

type FinanceValues = Pick<DecisionValues, typeof financeFields[number]>

export function formatFinanceRecord(values: FinanceValues): string {
  const signedAmounts = financeFields.map((field) => {
    const amount = values[field]
    if (amount === null || !Number.isSafeInteger(amount)) {
      throw new RangeError(`${field} must be a whole-dollar amount.`)
    }
    const signed = amount < 0 ? String(amount) : `+${amount}`
    if (signed.length > 10) throw new RangeError(`${field} exceeds its ten-character field.`)
    return signed.padStart(10)
  })
  return 'Finance'.padEnd(43) + signedAmounts.join('') + '0'.padStart(10).repeat(5) + '\r\n'
}
