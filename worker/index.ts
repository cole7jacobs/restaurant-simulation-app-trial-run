import { Hono } from 'hono'
import { cors } from 'hono/cors'

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
 * DB     — Cloudflare D1 database binding (Phase 2).
 *          Commented out until D1 is provisioned and the migration is applied.
 */
type Bindings = {
  ASSETS: AssetFetcher
  // DB: D1Database  // Phase 2: uncomment after `wrangler d1 create` and migration
}

const app = new Hono<{ Bindings: Bindings }>()

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * CORS — allows the Vite dev server (localhost:5173) to call the Worker
 * API (localhost:8787) during local development.
 * In production, the Worker serves both frontend and API from the same origin,
 * so CORS is not strictly required, but it is harmless.
 */
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

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

// Phase 2 — Authentication routes:
// import authRoutes from './routes/auth'
// app.route('/api/auth', authRoutes)

// Phase 3 — Student decision routes:
// import studentRoutes from './routes/student'
// app.route('/api/student', studentRoutes)

// Phase 4 — Professor routes (submissions, RFI generation):
// import professorRoutes from './routes/professor'
// app.route('/api/professor', professorRoutes)

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
