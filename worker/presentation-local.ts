// This entry point is used only by wrangler.presentation.jsonc and local development.
import { Hono } from 'hono'
import app from './index'
import { requireRole, requireSession, type AuthEnv } from './auth'

const local = new Hono<AuthEnv>()
local.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      (c.req.method === 'POST' && c.req.header('Origin') !== url.origin)) return c.notFound()
  await next()
})
local.use('*', requireSession, requireRole('professor'))
local.get('/presentation/status', async (c) => {
  try {
    const marker = await c.env.DB.prepare("SELECT id FROM PresentationSnapshotMarker WHERE id = 'presentation-demo-day-v1'").first()
    return marker ? c.json({ available: true }) : c.notFound()
  } catch { return c.notFound() }
})
local.post('/presentation/reset', async (c) => {
  const body = await c.req.json<{ confirm?: unknown }>().catch(() => null)
  if (body?.confirm !== 'reset-presentation') return c.json({ error: 'Explicit confirmation is required.' }, 400)
  try {
    const marker = await c.env.DB.prepare("SELECT id FROM PresentationSnapshotMarker WHERE id = 'presentation-demo-day-v1'").first()
    if (!marker) return c.notFound()
    const db = c.env.DB
    const checks = await db.prepare('SELECT COUNT(*) AS n FROM Team WHERE TeamID BETWEEN 1 AND 5 AND FirmNumber = TeamID').first<number>('n')
    if (checks !== 5) return c.json({ error: 'Presentation team mappings changed; reset was not applied.' }, 409)
    await db.batch([
      db.prepare('DELETE FROM MenuItemResult WHERE RoundNumber IN (1,2)'),
      db.prepare('DELETE FROM TeamMetrics WHERE RoundNumber IN (1,2)'),
      db.prepare('DELETE FROM SimulationResultImport WHERE RoundNumber IN (1,2)'),
      db.prepare('DELETE FROM MenuItemDecision WHERE RoundNumber = 2'),
      db.prepare('DELETE FROM TeamDecision WHERE RoundNumber = 2'),
      db.prepare('INSERT INTO TeamDecision SELECT * FROM PresentationTeamDecision'),
      db.prepare('INSERT INTO MenuItemDecision SELECT * FROM PresentationMenuItemDecision'),
      db.prepare('INSERT INTO SimulationResultImport SELECT * FROM PresentationSimulationResultImport'),
      db.prepare('INSERT INTO TeamMetrics SELECT * FROM PresentationTeamMetrics'),
      db.prepare('INSERT INTO MenuItemResult SELECT * FROM PresentationMenuItemResult'),
    ])
    return c.json({ status: 'ok' })
  } catch { return c.json({ error: 'Reset could not be completed; the database was not changed.' }, 503) }
})

const presentation = new Hono<AuthEnv>()
presentation.route('/api/professor', local)
presentation.all('*', (c) => app.fetch(c.req.raw, c.env, c.executionCtx))
export default presentation
