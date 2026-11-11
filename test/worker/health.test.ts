import { describe, it, expect, vi } from 'vitest'
import app from '../../worker/index'

/**
 * Worker API tests.
 *
 * Uses Hono's built-in `app.fetch()` method to send test requests directly
 * to the application without an HTTP server or Cloudflare runtime.
 *
 * The `ASSETS` binding is not provided in these tests. The Worker's catch-all
 * route handles this gracefully by returning 404 when ASSETS is unavailable.
 */

/** Minimal mock environment — no bindings needed for health check */
const mockEnv = {} as Parameters<typeof app.fetch>[1]

describe('Worker — GET /api/health', () => {
  it('returns HTTP 200', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBe(200)
  })

  it('returns JSON content-type', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await app.fetch(req, mockEnv)
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('returns { status: "ok" }', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await app.fetch(req, mockEnv)
    const body = (await res.json()) as { status: string; timestamp: string }
    expect(body.status).toBe('ok')
  })

  it('returns a valid ISO 8601 timestamp', async () => {
    const req = new Request('http://localhost/api/health')
    const res = await app.fetch(req, mockEnv)
    const body = (await res.json()) as { status: string; timestamp: string }
    // ISO 8601 dates can be parsed by Date without returning NaN
    expect(Number.isNaN(new Date(body.timestamp).getTime())).toBe(false)
  })
})

describe('Worker — unknown /api routes', () => {
  it('returns 404 for unregistered API paths', async () => {
    const req = new Request('http://localhost/api/nonexistent-endpoint')
    const res = await app.fetch(req, mockEnv)
    // Hono returns 404 for unmatched routes; the ASSETS fallback
    // also returns 404 when no ASSETS binding is provided in test env.
    expect(res.status).toBe(404)
  })
})

describe('Worker — GET /api/health/db', () => {
  it('uses bound table names and returns readiness for a migrated database', async () => {
    const first = vi.fn().mockResolvedValue(6)
    const bind = vi.fn().mockReturnValue({ first })
    const prepare = vi.fn().mockReturnValue({ bind })
    const env = { DB: { prepare } } as typeof mockEnv

    const res = await app.fetch(new Request('http://localhost/api/health/db'), env)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
    expect(bind).toHaveBeenCalledWith(
      'User', 'Team', 'TeamDecision', 'MenuItem', 'MenuItemDecision', 'TeamMetrics',
    )
    expect(first).toHaveBeenCalledWith('count')
  })

  it('returns 503 for a database with missing tables', async () => {
    const env = {
      DB: { prepare: () => ({ bind: () => ({ first: async () => 0 }) }) },
    } as unknown as typeof mockEnv

    const res = await app.fetch(new Request('http://localhost/api/health/db'), env)

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ status: 'unavailable' })
  })

  it('returns 503 if the binding is unavailable', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health/db'), mockEnv)

    expect(res.status).toBe(503)
  })
})
