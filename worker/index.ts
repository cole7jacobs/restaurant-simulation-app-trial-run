import type { D1Database } from '@cloudflare/workers-types'
import { Hono } from 'hono'
import { authRoutes } from './auth'

/**
 * Minimal type for Cloudflare's Static Assets fetcher binding.
 * Avoids global type collisions between DOM and Workers type definitions.
 */
interface AssetFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

/**
 * Worker environment bindings.
 *
 * ASSETS — Cloudflare Static Assets binding (serves the built React app from dist/).
 *          Configured in wrangler.jsonc under `assets.binding`.
 *
 * DB     — Cloudflare D1 database binding.
 */
type Bindings = {
  ASSETS: AssetFetcher
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

// ── API Routes ────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Basic health check endpoint.
 * Used by integration tests to confirm the Worker is running.
 * Returns HTTP 200 with { status: "ok", timestamp: <ISO 8601 string> }.
 */
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

const CORE_TABLES = ['User', 'Team', 'TeamDecision', 'MenuItem', 'MenuItemDecision', 'TeamMetrics']

// Readiness checks schema availability without exposing application data.
app.get('/api/health/db', async (c) => {
  try {
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM sqlite_schema WHERE type = 'table' AND name IN (?, ?, ?, ?, ?, ?)",
    ).bind(...CORE_TABLES).first<number>('count')

    if (count === CORE_TABLES.length) return c.json({ status: 'ok' })
  } catch {
    // Missing bindings and query failures both mean D1 is unavailable.
  }

  return c.json({ status: 'unavailable' }, 503)
})

app.route('/api', authRoutes)
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404))

// ── Static Asset Fallback (SPA) ───────────────────────────────────────────────

/**
 * Catch-all: forward all non-API requests to the Static Assets binding.
 *
 * The ASSETS binding serves files from dist/ (the Vite build output).
 * wrangler.jsonc configures `not_found_handling: "single-page-application"`,
 * so any path that does not match a file in dist/ receives index.html,
 * enabling React Router to handle client-side navigation.
 *
 * During unit tests, `c.env.ASSETS` is undefined — the check below
 * prevents a runtime error and returns 404 instead.
 */
app.all('*', async (c) => {
  if (!c.env.ASSETS) {
    return c.text('Not found', 404)
  }
  return c.env.ASSETS.fetch(c.req.raw)
})

export default app
