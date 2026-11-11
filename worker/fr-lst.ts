import { menuPreparations, menuSlots } from '../shared/decisions'
import { importRounds, type MenuResult, type TeamResults } from '../shared/results'

const numeric = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)'
const numericToken = new RegExp(`^${numeric}$`)
const firmHeader = /^\s*Firm\s+(\d+)\s+\S.*?\s+Period\s+(\d+)\s*$/i
const salesHeading = /^\s*SALES\s+\*\s+ASSETS\s*$/i
const menuHeader = /^\s*Selection\s+Sales\s+Purchase\s+Order\s+Internal\s+Cost per\s+Cost of\s+Orders\s+Total\s*$/i
const menuColumns = /^\s*Price\s+& Prep\.\s+Size\s+Promotion\s+unit of purchase\s+Goods Sold\s+Sold\s+Sales\s*$/i
const menuRow = new RegExp(
  `^\\s{5}(.{17})(.{9})(.{10})\\s*(${numeric})\\s+(Gm\\.|Cl\\.)\\s+(${numeric})\\s+(${numeric})\\s+(?:Kg\\.|Btl\\.|Cs\\.|Ltr\\.)\\s+(${numeric})\\s*%\\s+(${numeric})\\s+(${numeric})\\s*$`,
)

const financialLabels = {
  FoodSales: 'Food Sales', BeverageSales: 'Beverage Sales',
  FoodCost: 'Food Cost', BeverageCost: 'Beverage cost',
  OperatingProfit: 'OPERATING PROFIT', NetIncome: 'NET INCOME or LOSS',
} as const

export class ListingError extends Error {}

function number(raw: string, context: string, count = false) {
  const value = Number(raw)
  if (!numericToken.test(raw) || !Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER ||
      (count && (!Number.isSafeInteger(value) || value < 0))) {
    throw new ListingError(`${context} has an invalid numeric value.`)
  }
  return value
}

function uniqueLine(lines: string[], pattern: RegExp, context: string) {
  const indexes = lines.flatMap((line, index) => pattern.test(line) ? [index] : [])
  if (indexes.length !== 1) throw new ListingError(`${context} is missing or duplicated.`)
  return indexes[0]
}

function parseFirm(lines: string[], firm: number) {
  const label = `Firm ${firm}`
  const statistics = uniqueLine(lines, /^\s*per Day\s+& Training\/Hr\.\s+per Order\s+Orders\s+per\s+Order\s+per Order\s+Customer Count\s*$/, `${label} operating statistics`)
  const operating = (lines[statistics + 1] ?? '').trim().split(/\s+/)
  if (operating.length !== 7) throw new ListingError(`${label} operating statistics row is incomplete.`)
  const operatingValues = operating.map((value, index) =>
    number(value, `${label} operating statistic ${index + 1}`, index === 3 || index === 6))

  const financial = lines.slice(0, statistics).map((line) => line.slice(0, 65).trim())
  const metrics = Object.fromEntries(Object.entries(financialLabels).map(([key, name]) => {
    const index = uniqueLine(financial, new RegExp(`^${name}(?:\\s|$)`, 'i'), `${label} ${name}`)
    const values = financial[index].slice(name.length).trim().split(/\s+/)
    if (values.length !== 2) throw new ListingError(`${label} ${name} row is incomplete.`)
    number(values[1], `${label} ${name} percentage`)
    return [key, number(values[0], `${label} ${name}`)]
  })) as TeamResults
  metrics.FoodOrders = operatingValues[3]
  metrics.AvgDailyCustomerCount = operatingValues[6]

  const heading = uniqueLine(lines, menuHeader, `${label} menu table`)
  if (heading <= statistics || !menuColumns.test(lines[heading + 1] ?? '')) {
    throw new ListingError(`${label} menu table header is incomplete.`)
  }
  const menu: MenuResult[] = []
  for (const row of lines.slice(heading + 2)) {
    if (!row.trim() || row.trim() === '1') break
    const entry = menuRow.exec(row)
    if (!entry) throw new ListingError(`${label} menu row ${menu.length + 1} is malformed.`)
    const [, item, price, preparation, portion, unit, promotion, purchaseCost, cogs, orders, sales] = entry
    const name = item.trim()
    const prepLevel = (Object.prototype.hasOwnProperty.call(menuPreparations, name)
      ? menuPreparations[name].indexOf(preparation.trim()) : -1) + 1
    if (!prepLevel) throw new ListingError(`${label} has an unknown item or preparation: ${name} / ${preparation.trim()}.`)
    number(purchaseCost, `${label} ${name} purchase cost`)
    menu.push({
      ItemName: name, PrepLevel: prepLevel, OrderSize: number(portion, `${label} ${name} portion`),
      OrderSizeUnit: unit, SalesPrice: number(price.trim(), `${label} ${name} price`),
      InternalPromotion: number(promotion, `${label} ${name} promotion`, true),
      CostOfGoodsSoldPct: number(cogs, `${label} ${name} COGS`),
      OrdersSold: number(orders, `${label} ${name} orders`, true),
      TotalSales: number(sales, `${label} ${name} sales`),
    })
  }
  if (!menu.length || menu.length > menuSlots) throw new ListingError(`${label} must have one to ten menu rows.`)
  return { firm, metrics, menu }
}

export function parseListing(content: string) {
  const text = content.replace(/\x1a$/, '')
  if (/[^\x20-\x7e\r\n]/.test(text) || /\r(?!\n)/.test(text)) {
    throw new ListingError('Expected an ASCII FR.LST text file with CRLF or LF line endings.')
  }
  const lines = text.split(/\r?\n/)
  const summary = /^\s*Administrator's\s+Summary;.*\bPeriod\s+(\d+)\s*$/i
  const summaryIndex = uniqueLine(lines, summary, 'Administrator summary with a period')
  const round = Number(summary.exec(lines[summaryIndex])![1])
  if (!importRounds.includes(round)) throw new ListingError('The file period must be from Q1 through Q7.')

  const headers = lines.flatMap((line, index) => {
    const match = firmHeader.exec(line)
    return match ? [{ index, firm: Number(match[1]), period: Number(match[2]) }] : []
  })
  const seen = new Set<number>()
  const firms = headers.flatMap(({ index, firm, period }, position) => {
    const block = lines.slice(index + 1, headers[position + 1]?.index ?? lines.length)
    if (!block.some((line) => salesHeading.test(line))) return []
    if (period !== round) throw new ListingError(`Firm ${firm} reports a different period from the administrator summary.`)
    if (firm < 1 || firm > 5 || seen.has(firm)) throw new ListingError(`Invalid or duplicate primary statement for firm ${firm}.`)
    seen.add(firm)
    return [parseFirm(block, firm)]
  })
  if (firms.length !== 5) throw new ListingError('Expected one primary financial statement for each firm from 1 through 5.')

  const footer = uniqueLine(lines, /^\s*Market Area\s+Affiliation\s*$/i, 'Final firm affiliation roster')
  for (let firm = 1; firm <= 5; firm++) {
    if (!new RegExp(`^\\s*Firm\\s+${firm}\\s+\\S`).test(lines[footer + firm] ?? '')) {
      throw new ListingError('The final firm affiliation roster is incomplete.')
    }
  }
  return { round, firms: firms.sort((a, b) => a.firm - b.firm) }
}
