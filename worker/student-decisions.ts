import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { AuthEnv } from './auth'
import {
  decisionFields, decisionRounds, financeFields, menuPreparations, menuSlots, reportFields,
  type CatalogItem, type DecisionValues, type MenuSelection,
} from '../shared/decisions'
import { formatFinanceRecord } from './rfi-finance'

const fields = [...decisionFields, ...reportFields].map(({ key }) => key)
const columns = fields.join(', ')
const catalogQuery = 'SELECT MenuItemID, ItemName, OrderSizeUnit FROM MenuItem ORDER BY ItemName'
const supportedCatalog = (items: CatalogItem[]) => items.filter(({ ItemName }) => Object.prototype.hasOwnProperty.call(menuPreparations, ItemName))

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
}

// Maximum magnitudes from the DECIMAL(p,s) types in data-dictionary-final.docx.
// Finance changes are whole dollars here, so DECIMAL(10,2) allows up to 99,999,999.
// INT fields (EntertainmentBudget, MaintenanceBudget, InternalPromotion) have no documented
// limit and keep the previous generic ceiling in validNumber.
const maxima: Record<string, number> = {
  StaffPerDay: 999.9, // DECIMAL(4,1)
  HourlyCompensation: 999.99, // DECIMAL(5,2)
  AmenitiesPerOrder: 99.99, // DECIMAL(4,2)
  TimeDepositChange: 99999999, // DECIMAL(10,2), whole dollars
  CertificateOfDepositChange: 99999999,
  NotePayableChange: 99999999,
  OrderSize: 9999.9, // DECIMAL(5,1)
  // DECIMAL(10,2) allows 99,999,999.99, but the RFI file gives each value 10 characters (worker/rfi.ts),
  // so 9,999,999.99 is the largest price that can be exported.
  SalesPrice: 9999999.99,
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

function validate(input: Record<string, unknown>, catalog: CatalogItem[], submit: boolean) {
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

export const studentDecisions = new Hono<AuthEnv>()

studentDecisions.get('/decisions/:round', async (c) => {
  const round = Number(c.req.param('round'))
  if (!decisionRounds.includes(round)) return c.json({ error: 'Choose a decision round from Q2 through Q7.' }, 400)
  const { teamId } = c.get('account')
  const db = c.env.DB
  const [catalog, decision, menu] = await db.batch([
    db.prepare(catalogQuery),
    db.prepare(`SELECT ${columns}, Revision, SubmittedAt FROM TeamDecision WHERE TeamID = ? AND RoundNumber = ?`)
      .bind(teamId, round),
    db.prepare(`SELECT MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice
      FROM MenuItemDecision WHERE TeamID = ? AND RoundNumber = ? ORDER BY SlotNumber`).bind(teamId, round),
  ])
  const row = decision.results[0] as (DecisionValues & { Revision: string; SubmittedAt: string | null }) | undefined
  return c.json({
    catalog: supportedCatalog(catalog.results as CatalogItem[]),
    values: Object.fromEntries(fields.map((key) => [key, row?.[key] ?? null])),
    menu: menu.results,
    revision: row?.Revision ?? null,
    submittedAt: row?.SubmittedAt ?? null,
  })
})

studentDecisions.post('/decisions/:round', bodyLimit({ maxSize: 8192 }), async (c) => {
  const round = Number(c.req.param('round'))
  if (!decisionRounds.includes(round)) return c.json({ error: 'Choose a decision round from Q2 through Q7.' }, 400)
  if (c.req.header('Content-Type')?.split(';')[0] !== 'application/json') return c.json({ error: 'Expected JSON.' }, 415)
  const input = object(await c.req.json<unknown>().catch(() => null))
  const { revision, submit } = input
  if ((revision !== null && (typeof revision !== 'string' || revision.length > 36)) || typeof submit !== 'boolean') {
    return c.json({ error: 'Invalid decision request.' }, 400)
  }
  const { teamId } = c.get('account')
  const db = c.env.DB
  const catalog = supportedCatalog((await db.prepare(catalogQuery).all<CatalogItem>()).results)
  const error = validate(input, catalog, submit)
  if (error) return c.json({ error }, 400)

  const values = input.values as DecisionValues
  const menu = input.menu as MenuSelection[]
  const nextRevision = crypto.randomUUID()
  const submittedAt = submit ? new Date().toISOString() : null
  const ownsWrite = 'EXISTS (SELECT 1 FROM TeamDecision WHERE TeamID = ? AND RoundNumber = ? AND Revision = ?)'
  const parent = db.prepare(`
    INSERT INTO TeamDecision (TeamID, RoundNumber, ${columns}, Revision, SubmittedAt)
    SELECT ?, ?, ${fields.map(() => '?').join(', ')}, ?, ?
    WHERE ? IS NULL OR EXISTS (SELECT 1 FROM TeamDecision WHERE TeamID = ? AND RoundNumber = ?)
    ON CONFLICT (TeamID, RoundNumber) DO UPDATE SET
      ${fields.map((key) => `${key} = excluded.${key}`).join(', ')},
      Revision = excluded.Revision, SubmittedAt = excluded.SubmittedAt
    WHERE TeamDecision.Revision = ? AND TeamDecision.SubmittedAt IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM MenuItemDecision
        WHERE TeamID = excluded.TeamID AND RoundNumber = excluded.RoundNumber
          AND (CostOfGoodsSoldPct IS NOT NULL OR OrdersSold IS NOT NULL OR TotalSales IS NOT NULL)
      )
  `).bind(teamId, round, ...fields.map((key) => values[key]), nextRevision, submittedAt, revision, teamId, round, revision)
  const [updated] = await db.batch([
    parent,
    db.prepare(`DELETE FROM MenuItemDecision WHERE TeamID = ? AND RoundNumber = ? AND ${ownsWrite}`)
      .bind(teamId, round, teamId, round, nextRevision),
    ...menu.map((row, index) => db.prepare(`
      INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice)
      SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${ownsWrite}
    `).bind(teamId, round, index + 1, row.MenuItemID, row.PrepLevel, row.OrderSize, row.InternalPromotion,
      row.SalesPrice, teamId, round, nextRevision)),
  ])
  if (updated.meta.changes !== 1) {
    return c.json({ error: 'This round has changed, was submitted, or has recorded results. Reload to see the saved decisions.' }, 409)
  }
  return c.json({ revision: nextRevision, submittedAt })
})
