import { professorRfi } from './professor-rfi'
import type { D1Database } from '@cloudflare/workers-types'
import { Hono, type MiddlewareHandler } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { studentDecisions } from './student-decisions'
import { verifyPassword } from './password.mjs'

export type Account = {
  userId: number
  name: string
  role: 'student' | 'professor'
  teamId: number | null
  teamName: string | null
}

export type AuthEnv = { Bindings: { DB: D1Database }; Variables: { account: Account; expiresAt: number } }

const SESSION_AGE = 8 * 60 * 60
const LOGIN_WINDOW = 300
const COOKIE = '__Host-restaurant-session'
const LOCAL_COOKIE = 'restaurant-local-session'
const accountFields = `u.UserID AS userId, u.Name AS name, u.Role AS role,
  t.TeamID AS teamId, t.TeamName AS teamName`
const accountJoin = 'LEFT JOIN Team t ON t.TeamID = u.TeamID'
const eligible = "((u.Role = 'student' AND t.TeamID IS NOT NULL) OR (u.Role = 'professor' AND u.TeamID IS NULL))"

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function digest(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
}

function localHttp(url: URL) {
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
}

function cookies(url: URL) {
  const local = localHttp(url)
  return {
    name: local ? LOCAL_COOKIE : COOKIE,
    options: { path: '/', secure: !local, httpOnly: true, sameSite: 'Lax' as const },
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

const requireSession: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const { name } = cookies(new URL(c.req.url))
  const token = getCookie(c, name)
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return c.json({ error: 'Sign in required.' }, 401)

  const account = await c.env.DB.prepare(`
    SELECT ${accountFields}, s.ExpiresAt AS expiresAt FROM AuthSession s JOIN User u USING (UserID) ${accountJoin}
    WHERE s.TokenHash = ? AND s.ExpiresAt > ? AND ${eligible}
  `).bind(await digest(token), nowSeconds()).first<Account & { expiresAt: number }>()
  if (!account) return c.json({ error: 'Session expired or invalid. Sign in again.' }, 401)
  const { expiresAt, ...identity } = account
  c.set('account', identity)
  c.set('expiresAt', expiresAt)
  await next()
}

function requireRole(role: Account['role']): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    if (c.get('account').role !== role) return c.json({ error: 'Access denied.' }, 403)
    await next()
  }
}

export const authRoutes = new Hono<AuthEnv>()

authRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  const url = new URL(c.req.url)
  if (!localHttp(url) && url.protocol !== 'https:') return c.json({ error: 'HTTPS required.' }, 403)
  if (c.req.method === 'POST' && c.req.header('Origin') !== url.origin) {
    return c.json({ error: 'Invalid request origin.' }, 403)
  }
  await next()
})

authRoutes.onError(() => new Response(JSON.stringify({ error: 'The service is temporarily unavailable.' }), {
  status: 503,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
}))

authRoutes.post('/auth/login', bodyLimit({
  maxSize: 4096,
  onError: (c) => c.json({ error: 'Request too large.' }, 413),
}), async (c) => {
  if (c.req.header('Content-Type')?.split(';')[0] !== 'application/json') {
    return c.json({ error: 'Expected JSON.' }, 415)
  }
  const input = await c.req.json<{ email?: unknown; password?: unknown }>().catch(() => null)
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input?.password === 'string' ? input.password : ''
  const invalid = { error: 'Invalid email or password.' }
  if (!email || email.length > 100 || !password || password.length > 256) return c.json(invalid, 401)

  const db = c.env.DB
  const now = nowSeconds()
  const ip = c.req.header('CF-Connecting-IP') ?? 'local'
  const client = await digest(`ip:${ip}`)
  const identity = await digest(`login:${ip}:${email}`)
  const [, , limit] = await db.batch<{ ClientHash: string; Attempts: number }>([
    db.prepare('DELETE FROM LoginRateLimit WHERE ExpiresAt <= ?').bind(now),
    db.prepare('DELETE FROM AuthSession WHERE ExpiresAt <= ?').bind(now),
    db.prepare(`
      INSERT INTO LoginRateLimit (ClientHash, ExpiresAt, Attempts) VALUES (?, ?, 1), (?, ?, 1)
      ON CONFLICT (ClientHash) DO UPDATE SET Attempts = MIN(Attempts + 1, 101)
      RETURNING ClientHash, Attempts
    `).bind(client, now + LOGIN_WINDOW, identity, now + LOGIN_WINDOW),
  ])
  if (limit.results.some((row) => row.Attempts > (row.ClientHash === client ? 100 : 8))) return c.json({ error: 'Too many attempts. Try again later.' }, 429, {
    'Retry-After': String(LOGIN_WINDOW),
  })

  const user = await db.prepare(`
    SELECT ${accountFields}, u.PasswordHash AS passwordHash FROM User u ${accountJoin}
    WHERE u.Email = ? COLLATE NOCASE AND ${eligible}
  `).bind(email).first<Account & { passwordHash: string }>()
  if (!(await verifyPassword(password, user?.passwordHash)) || !user) return c.json(invalid, 401)

  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const { name, options } = cookies(new URL(c.req.url))
  const previous = getCookie(c, name)
  const insert = db.prepare('INSERT INTO AuthSession (TokenHash, UserID, ExpiresAt) VALUES (?, ?, ?)')
    .bind(await digest(token), user.userId, now + SESSION_AGE)
  if (previous && /^[a-f0-9]{64}$/.test(previous)) {
    await db.batch([db.prepare('DELETE FROM AuthSession WHERE TokenHash = ?').bind(await digest(previous)), insert])
  } else {
    await insert.run()
  }
  setCookie(c, name, token, { ...options, maxAge: SESSION_AGE })
  const { passwordHash: _, ...account } = user
  return c.json({ account, expiresAt: now + SESSION_AGE })
})

authRoutes.post('/auth/logout', async (c) => {
  const { name, options } = cookies(new URL(c.req.url))
  const token = getCookie(c, name)
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    await c.env.DB.prepare('DELETE FROM AuthSession WHERE TokenHash = ?').bind(await digest(token)).run()
  }
  deleteCookie(c, name, options)
  return c.body(null, 204)
})

authRoutes.get('/auth/session', requireSession, (c) => c.json({ account: c.get('account'), expiresAt: c.get('expiresAt') }))

authRoutes.use('/student/*', requireSession, requireRole('student'))
authRoutes.route('/student', studentDecisions)
authRoutes.get('/student/team/:teamId?', async (c) => {
  const { teamId } = c.get('account')
  const requested = c.req.param('teamId')
  if (requested !== undefined && requested !== String(teamId)) {
    return c.json({ error: 'Access denied.' }, 403)
  }
  const team = await c.env.DB.prepare('SELECT TeamID, TeamName, FirmNumber FROM Team WHERE TeamID = ?')
    .bind(teamId).first()
  return team ? c.json({ team }) : c.json({ error: 'Team unavailable.' }, 404)
})

authRoutes.use('/professor/*', requireSession, requireRole('professor'))
authRoutes.route('/professor', professorRfi)
authRoutes.get('/professor/submissions', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT t.TeamID, t.TeamName, t.FirmNumber, d.RoundNumber, d.SubmittedAt
    FROM Team t LEFT JOIN TeamDecision d USING (TeamID)
    ORDER BY t.TeamName, t.TeamID, d.RoundNumber DESC
  `).all()
  return c.json({ submissions: results })
})
