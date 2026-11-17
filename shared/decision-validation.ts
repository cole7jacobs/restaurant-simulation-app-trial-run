import { decisionFields, financeFields, menuSlots, reportFields, type CatalogItem, type DecisionValues } from './decisions'
import { formatFinanceRecord } from '../worker/rfi-finance'

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

// Maximum magnitudes come from the data dictionary and the RFI field widths.
// Finance changes are whole dollars. Fields without documented limits keep
// the generic ceiling in validNumber. The API and preview share these rules.
const maxima: Record<string, number> = {
  StaffPerDay: 999.9,
  HourlyCompensation: 999.99,
  AmenitiesPerOrder: 99.99,
  TimeDepositChange: 99999999,
  CertificateOfDepositChange: 99999999,
  NotePayableChange: 99999999,
  OrderSize: 9999.9,
  SalesPrice: 9999999.99, // RFI allows ten characters for this value.
}

function validNumber(value: unknown, decimals: number, signed = false, max?: number): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (!signed && value < 0)) return false
  if (Math.abs(value) >= 10 ** (signed ? 9 : 10)) return false
  if (max !== undefined && Math.abs(value) > max) return false
  const formatted = value.toFixed(decimals)
  return formatted.length <= 10 && Number(formatted) === value
}

function limitText(max: number, decimals: number, signed: boolean) {
  const text = max.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return signed ? `between -${text} and ${text}` : `at most ${text}`
}

export function validateDecision(input: Record<string, unknown>, catalog: CatalogItem[], submit: boolean) {
  const values = object(input.values)
  for (const { key, label, decimals } of decisionFields) {
    const value = values[key]
    if (value === null && !submit) continue
    const signed = financeFields.some((field) => field === key)
    const max = maxima[key]
    if (!validNumber(value, decimals, signed, max)) {
      const range = max === undefined ? 'a smaller value' : limitText(max, decimals, signed)
      return `${label} must be ${range}, with at most ${decimals} decimal places.`
    }
  }
  for (const { key, label } of reportFields) {
    const value = values[key]
    if (value !== 0 && value !== 1 && (submit || value !== null)) return `Choose Yes or No for ${label}.`
  }
  if (submit) formatFinanceRecord(values as DecisionValues)

  if (!Array.isArray(input.menu) || input.menu.length > menuSlots || (submit && !input.menu.length)) {
    return `Enter ${submit ? 'one to' : 'up to'} ${menuSlots} menu selections.`
  }
  for (const [index, item] of input.menu.entries()) {
    const row = object(item)
    if (typeof row.OrderSize === 'number' && row.OrderSize > maxima.OrderSize) {
      return `Menu selection ${index + 1}: order size must be ${limitText(maxima.OrderSize, 1, false)}, with at most 1 decimal place.`
    }
    if (typeof row.SalesPrice === 'number' && row.SalesPrice > maxima.SalesPrice) {
      return `Menu selection ${index + 1}: sales price must be ${limitText(maxima.SalesPrice, 2, false)}, with at most 2 decimal places.`
    }
    if (!catalog.some(({ MenuItemID }) => MenuItemID === row.MenuItemID) ||
        ![1, 2, 3].some((level) => level === row.PrepLevel) ||
        !validNumber(row.OrderSize, 1) || !validNumber(row.InternalPromotion, 0) || !validNumber(row.SalesPrice, 2)) {
      return `Complete menu selection ${index + 1} with an item, preparation, portion, promotion, and price.`
    }
  }
  const seen = new Set<string>()
  for (const item of input.menu) {
    const { MenuItemID, PrepLevel } = object(item)
    const key = `${MenuItemID}:${PrepLevel}`
    if (seen.has(key)) return 'You entered the same item and preparation twice. Choose a different preparation or remove one.'
    seen.add(key)
  }
  return null
}
