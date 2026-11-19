/** Creates a new, local-only presentation D1 state directory from private reference files. */
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { decisionFields, financeFields, menuPreparations, type DecisionValues } from '../shared/decisions'
import { validateDecision } from '../shared/decision-validation'
import { parseListing } from '../worker/fr-lst'
import { generateRfi } from '../worker/rfi'

const name = process.argv[2]
if (!name || !/^presentation-[a-z0-9-]+$/.test(name) || process.argv.length !== 3) {
  throw new Error('Usage: npx vite-node scripts/prepare-presentation.ts presentation-<unique-name>')
}
const state = resolve('.wrangler', name)
if (existsSync(state)) throw new Error(`Refusing to overwrite existing state: ${state}. Choose a new name.`)
const root = resolve('input-output')
const q1File = resolve(root, '00_Q1-simulation-start/output-of-simulation/FR.LST')
const q1Bytes = readFileSync(q1File)
const listing = parseListing(q1Bytes.toString('utf8'))
if (listing.round !== 1) throw new Error('The Q1 listing does not report period 1.')
const sqlText = (value: string) => `'${value.replace(/'/g, "''")}'`
const sqlNumber = (value: number) => {
  if (!Number.isFinite(value)) throw new Error('Invalid numeric reference value.')
  return String(value)
}
const records: string[] = []
const names = ['Demo Bistro', 'Demo Grill', 'Demo Cafe', 'Demo Kitchen', 'Demo Tavern']
for (let firm = 1; firm <= 5; firm++) {
  const path = resolve(root, `01_Q2-decisions/required-by-legacy-simulation/RFI${firm}ME.TXT`)
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  if (!lines[3]?.includes(`Firm ${firm}`) || !lines[18]?.startsWith('Operations') || !lines[19]?.startsWith('Finance')) throw new Error(`Unexpected records in RFI${firm}ME.TXT`)
  const numbers = (line: string) => (line.slice(43).match(/.{10}/g) ?? []).map((field) => {
    if (!field.trim() || !Number.isFinite(Number(field))) throw new Error(`Invalid numeric field in RFI${firm}ME.TXT`)
    return Number(field)
  })
  const ops = numbers(lines[18]), finance = numbers(lines[19])
  if (ops.length !== 10 || finance.length !== 10 || finance.some((value) => value !== 0) || ops[7] !== 0) {
    throw new Error(`Unsupported historical fields in RFI${firm}ME.TXT; do not guess their meanings.`)
  }
  const values = {
    ...Object.fromEntries(decisionFields.slice(0, 5).map(({ key }, index) => [key, ops[index]])),
    ...Object.fromEntries(financeFields.map((key, index) => [key, finance[index]])),
    ReportGuestSatisfaction: ops[5], ReportFinancial: ops[6], ReportProduct: ops[7],
  } as DecisionValues
  const menu = lines.slice(4, 14).filter((line) => line.slice(0, 32).trim()).map((line) => {
    const ItemName = line.slice(0, 32).trim()
    const [PrepLevel, OrderSize, InternalPromotion, SalesPrice] = numbers(line)
    if (menuPreparations[ItemName]?.[PrepLevel - 1] !== line.slice(32, 43).trim()) throw new Error(`Unknown preparation for ${ItemName}`)
    return { ItemName, PrepLevel, OrderSize, InternalPromotion, SalesPrice }
  })
  const catalog = Object.keys(menuPreparations).map((ItemName, index) => ({ ItemName, MenuItemID: index + 1, OrderSizeUnit: 'Gm.' }))
  const inputMenu = menu.map((row) => ({ ...row, MenuItemID: catalog.find((item) => item.ItemName === row.ItemName)!.MenuItemID }))
  const validation = validateDecision({ values, menu: inputMenu }, catalog, true)
  if (validation) throw new Error(`Firm ${firm}: ${validation}`)
  const generated = generateRfi(firm, values, menu).content.split('\r\n')
  for (const index of [...Array(19).keys(), 20, 21, 22, 23]) {
    if (generated[index] !== lines[index]) throw new Error(`Firm ${firm}: RFI record ${index + 1} differs from archive.`)
  }
  const keys = [...decisionFields.map(({ key }) => key), 'ReportGuestSatisfaction', 'ReportFinancial', 'ReportProduct'] as const
  records.push(`INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES (${firm}, ${sqlText(names[firm - 1])}, ${firm});`)
  records.push(`INSERT INTO TeamDecision (TeamID, RoundNumber, SubmittedAt, Revision, ${keys.join(', ')}) VALUES (${firm}, 2, ${firm === 1 ? 'NULL' : sqlText(new Date().toISOString())}, ${sqlText(randomUUID())}, ${keys.map((key) => sqlNumber(values[key]!)).join(', ')});`)
  menu.forEach((row, index) => records.push(`INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (${firm}, 2, ${index + 1}, (SELECT MenuItemID FROM MenuItem WHERE ItemName = ${sqlText(row.ItemName)}), ${sqlNumber(row.PrepLevel)}, ${sqlNumber(row.OrderSize)}, ${sqlNumber(row.InternalPromotion)}, ${sqlNumber(row.SalesPrice)});`))
}
const metrics = ['FoodSales', 'BeverageSales', 'FoodCost', 'BeverageCost', 'OperatingProfit', 'NetIncome', 'FoodOrders', 'AvgDailyCustomerCount'] as const
const hash = createHash('sha256').update(q1Bytes).digest('hex')
records.push(`INSERT INTO SimulationResultImport VALUES (1, ${sqlText(hash)}, ${sqlText(JSON.stringify(names.map((_, index) => [index + 1, index + 1])))}, ${sqlText(new Date().toISOString())}, ${sqlText(randomUUID())});`)
for (const { firm, metrics: data, menu } of listing.firms) {
  records.push(`INSERT INTO TeamMetrics (TeamID, RoundNumber, ${metrics.join(', ')}) VALUES (${firm}, 1, ${metrics.map((key) => sqlNumber(data[key])).join(', ')});`)
  menu.forEach((row, index) => records.push(`INSERT INTO MenuItemResult (TeamID, RoundNumber, ResultSlot, MenuItemID, PrepLevel, DecisionSlot, CostOfGoodsSoldPct, OrdersSold, TotalSales) VALUES (${firm}, 1, ${index + 1}, (SELECT MenuItemID FROM MenuItem WHERE ItemName = ${sqlText(row.ItemName)} AND OrderSizeUnit = ${sqlText(row.OrderSizeUnit)}), ${sqlNumber(row.PrepLevel)}, NULL, ${sqlNumber(row.CostOfGoodsSoldPct)}, ${sqlNumber(row.OrdersSold)}, ${sqlNumber(row.TotalSales)});`))
}
mkdirSync(resolve('.wrangler'), { recursive: true, mode: 0o700 })
mkdirSync(state, { recursive: false, mode: 0o700 })
const args = ['node_modules/wrangler/bin/wrangler.js', 'd1']
execFileSync(process.execPath, [...args, 'migrations', 'apply', 'DB', '--local', '--persist-to', state], { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
const sqlFile = resolve(state, 'presentation-private.sql')
writeFileSync(sqlFile, records.join('\n'), { mode: 0o600 })
execFileSync(process.execPath, [...args, 'execute', 'DB', '--local', '--persist-to', state, '--file', sqlFile], { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
console.log(`Presentation database ready: ${state}\nFirm 1 is a Q2 draft; firms 2–5 are submitted. No accounts were created.`)
