import { Hono } from 'hono'
import { decisionRounds, type DecisionValues } from '../shared/decisions'
import type { AuthEnv } from './auth'
import { generateRfi, type RfiSelection } from './rfi'

export const professorRfi = new Hono<AuthEnv>()

professorRfi.get('/rfi/:round', async (c) => {
  const round = Number(c.req.param('round'))
  if (!decisionRounds.includes(round)) return c.json({ error: 'Choose a round from Q2 through Q7.' }, 400)
  const { results } = await c.env.DB.prepare(`
    SELECT t.TeamID, t.TeamName, t.FirmNumber, d.SubmittedAt,
      CASE WHEN d.TeamID IS NOT NULL THEN 1 ELSE 0 END AS HasDecisions
    FROM Team t LEFT JOIN TeamDecision d ON d.TeamID = t.TeamID AND d.RoundNumber = ?
    ORDER BY t.FirmNumber IS NULL, t.FirmNumber, t.TeamName, t.TeamID
  `).bind(round).all()
  return c.json({ teams: results })
})

professorRfi.get('/rfi/:round/:teamId', async (c) => {
  const round = Number(c.req.param('round'))
  const rawTeamId = c.req.param('teamId')
  const teamId = Number(rawTeamId)
  if (!decisionRounds.includes(round) || !/^-?\d+$/.test(rawTeamId) || !Number.isSafeInteger(teamId)) {
    return c.json({ error: 'Choose a valid team and round from Q2 through Q7.' }, 400)
  }
  const db = c.env.DB
  const [decisions, menu] = await db.batch([
    db.prepare(`
      SELECT t.FirmNumber, d.* FROM Team t
      LEFT JOIN TeamDecision d ON d.TeamID = t.TeamID AND d.RoundNumber = ?
      WHERE t.TeamID = ?
    `).bind(round, teamId),
    db.prepare(`
      SELECT i.ItemName, m.PrepLevel, m.OrderSize, m.InternalPromotion, m.SalesPrice
      FROM MenuItemDecision m JOIN MenuItem i USING (MenuItemID)
      WHERE m.TeamID = ? AND m.RoundNumber = ? ORDER BY m.SlotNumber
    `).bind(teamId, round),
  ])
  const decision = decisions.results[0] as (DecisionValues & { FirmNumber: number | null; SubmittedAt: string | null }) | undefined
  if (!decision) return c.json({ error: 'Team not found.' }, 404)
  if (!decision.SubmittedAt) return c.json({ error: 'This team has not submitted decisions for the selected round.' }, 409)

  try {
    const { filename, content } = generateRfi(decision.FirmNumber, decision, menu.results as RfiSelection[])
    return c.body(content, 200, {
      'Content-Type': 'text/plain; charset=us-ascii',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
  } catch (error) {
    if (error instanceof RangeError) return c.json({ error: error.message }, 422)
    throw error
  }
})
