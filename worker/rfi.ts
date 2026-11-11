import { decisionFields, menuPreparations, menuSlots, type DecisionValues, type MenuSelection } from '../shared/decisions'
import { formatFinanceRecord } from './rfi-finance'

export type RfiSelection = Omit<MenuSelection, 'MenuItemID'> & { ItemName: string }

function field(value: number | null, decimals: number, label: string) {
  if (value === null || !Number.isFinite(value) || value < 0 || value >= 10 ** 10) {
    throw new RangeError(`${label} requires a nonnegative value that fits its field.`)
  }
  const formatted = value.toFixed(decimals)
  if (formatted.length > 10 || Number(formatted) !== value) {
    throw new RangeError(`${label} must fit ten characters with ${decimals} decimal places.`)
  }
  return formatted.padStart(10)
}

function fixedRecord(label: string, values: string[]) {
  return label.padEnd(43) + values.map((value) => value.padStart(10)).join('')
}

export function generateRfi(firm: number | null, values: DecisionValues, menu: RfiSelection[]) {
  if (firm === null || !Number.isInteger(firm) || firm < 1 || firm > 5) {
    throw new RangeError('Assign this team a firm number from 1 through 5.')
  }
  if (!menu.length || menu.length > menuSlots) throw new RangeError('Provide one to ten menu selections.')
  if (values.ReportProduct !== 0) {
    throw new RangeError('Export requires Product report set to No. The archive has no confirmed enabled value.')
  }

  const menuRecords = menu.map((row, index) => {
    const preparation = menuPreparations[row.ItemName]?.[row.PrepLevel - 1]
    if (!preparation || ![1, 2, 3].includes(row.PrepLevel)) {
      throw new RangeError(`Menu selection ${index + 1} has an unknown item or preparation.`)
    }
    return row.ItemName.padEnd(32) + preparation.padEnd(11) +
      field(row.PrepLevel, 0, 'Preparation level') +
      field(row.OrderSize, 1, `Selection ${index + 1} portion`) +
      field(row.InternalPromotion, 0, `Selection ${index + 1} promotion`) +
      field(row.SalesPrice, 2, `Selection ${index + 1} price`) + '     0.000         0'
  })
  const emptyMenuRecords = Array<string>(menuSlots - menu.length).fill('0.000'.padStart(93))
  const flags = [values.ReportGuestSatisfaction, values.ReportFinancial]
  if (flags.some((flag) => flag !== 0 && flag !== 1)) {
    throw new RangeError('Choose Yes or No for the guest satisfaction and financial reports.')
  }
  const operations = decisionFields.slice(0, 5)
    .map(({ key, decimals, label }) => field(values[key], decimals, label))
  const zero = '0'.padStart(10)

  // These fixed values occur in every archived Q5–Q7 file.
  const lines = [
    '', '', '', `                  Firm ${firm}`.padEnd(84) + 'LS        B1',
    ...menuRecords, ...emptyMenuRecords,
    fixedRecord('Management', ['1.5', '0.0', '0.0', ...Array<string>(7).fill('0')]),
    fixedRecord('Supervisory', ['1.0', '0.0', '0.0', ...Array<string>(7).fill('0')]),
    fixedRecord('Service', ['10.0', '0.0', '0.0', '0', '0']),
    fixedRecord('Support', ['9.0', '0.0', '0.0', '0', '0']),
    'Operations'.padEnd(43) + operations.join('') +
      flags.map((flag) => String(flag).padStart(10)).join('') + zero.repeat(2) + '12000'.padStart(10),
    formatFinanceRecord(values).slice(0, -2),
    ...['Assets - Investments', '       - Leases', '       - Borrowings', 'Variances']
      .map((label) => fixedRecord(label, ['0', '0'])),
    '', '',
  ]
  return { filename: `RFI${firm}ME.TXT`, content: lines.join('\r\n') }
}
