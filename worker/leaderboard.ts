import { Hono } from 'hono'
import type { AuthEnv } from './auth'
import { importRounds } from '../shared/results'

export const leaderboard = new Hono<AuthEnv>()

type Row = { teamId: number; teamName: string; firmNumber: number; netIncome: number; operatingProfit: number; foodSales: number; beverageSales: number }

leaderboard.get('/:round', async (c) => {
  const raw = c.req.param('round')
  const round = Number(raw)
  if (!/^[1-7]$/.test(raw) || !importRounds.includes(round)) return c.json({ error: 'Choose a round from Q1 through Q7.' }, 400)
  // Use the import's firm-to-team mapping, the same source used by student results.
  // A single read prevents a reset/import from producing a mixed set of firms.
  const { results } = await c.env.DB.prepare(`
    SELECT t.TeamID AS teamId, t.TeamName AS teamName, json_extract(mapping.value, '$[0]') AS firmNumber,
      m.NetIncome AS netIncome, m.OperatingProfit AS operatingProfit,
      m.FoodSales AS foodSales, m.BeverageSales AS beverageSales
    FROM SimulationResultImport imported, json_each(imported.TeamMapping) mapping
    JOIN Team t ON t.TeamID = json_extract(mapping.value, '$[1]')
    JOIN TeamMetrics m ON m.TeamID = t.TeamID AND m.RoundNumber = imported.RoundNumber
    WHERE imported.RoundNumber = ? AND json_array_length(imported.TeamMapping) = 5
  `).bind(round).all<Row>()
  const firmNumbers = new Set(results.map((row) => row.firmNumber))
  const teams = new Set(results.map((row) => row.teamId))
  const account = c.get('account')
  if (results.length !== 5 || teams.size !== 5 || firmNumbers.size !== 5 ||
      ![1, 2, 3, 4, 5].every((firm) => firmNumbers.has(firm)) ||
      (account.role === 'student' && !teams.has(account.teamId!))) {
    return c.json({ error: 'Results for this quarter have not been released yet.' }, 404)
  }
  return c.json({ round, teams: results })
})
