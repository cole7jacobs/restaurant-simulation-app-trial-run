import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { AuthEnv } from './auth'
import {
  decisionFields, decisionRounds, menuPreparations, reportFields,
  type CatalogItem, type DecisionValues, type MenuSelection,
} from '../shared/decisions'
import { validateDecision } from '../shared/decision-validation'

const fields = [...decisionFields, ...reportFields].map(({ key }) => key)
const columns = fields.join(', ')
const catalogQuery = 'SELECT MenuItemID, ItemName, OrderSizeUnit FROM MenuItem ORDER BY ItemName'
const supportedCatalog = (items: CatalogItem[]) => items.filter(({ ItemName }) => Object.prototype.hasOwnProperty.call(menuPreparations, ItemName))

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {}
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
  const error = validateDecision(input, catalog, submit)
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
