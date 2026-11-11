// @vitest-environment node
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unstable_splitSqlQuery } from 'wrangler'
import app from '../../worker/index'
import { decisionFields, reportFields, type DecisionResponse } from '../../shared/decisions'
import { hashPassword } from '../../worker/password.mjs'

const migrations = import.meta.glob<string>('../../db/migrations/*.sql', {
  eager: true, query: '?raw', import: 'default',
})
const origin = 'https://restaurant.example'
const student = 'student@example.invalid'
const professor = 'professor@example.invalid'
const password = crypto.randomUUID()
let runtime: Miniflare
let db: Awaited<ReturnType<Miniflare['getD1Database']>>

beforeAll(async () => {
  runtime = new Miniflare({
    modules: true,
    script: 'export default { fetch: () => new Response(null) }',
    d1Databases: ['DB'],
    d1Persist: false,
  })
  db = await runtime.getD1Database('DB')
  for (const name of Object.keys(migrations).sort()) {
    await db.batch(unstable_splitSqlQuery(migrations[name]).map((sql) => db.prepare(sql)))
  }
  const hash = await hashPassword(password)
  const insertUser = 'INSERT INTO User (Email, PasswordHash, Name, Role, TeamID) VALUES (?, ?, ?, ?, ?)'
  await db.batch([
    db.prepare("INSERT INTO Team (TeamID, TeamName) VALUES (1, 'Student Team'), (2, 'Other Team')"),
    db.prepare(insertUser).bind(student, hash, 'Student', 'student', 1),
    db.prepare(insertUser).bind(professor, hash, 'Professor', 'professor', null),
    db.prepare("INSERT INTO TeamDecision (TeamID, RoundNumber, SubmittedAt) VALUES (1, 2, NULL), (2, 2, '2026-11-10T18:00:00Z')"),
  ])
}, 15000)

afterAll(async () => {
  await runtime?.dispose()
})

function request(path: string, init?: RequestInit) {
  const env = { DB: db } as unknown as Parameters<typeof app.fetch>[1]
  return app.fetch(new Request(`${origin}/api${path}`, init), env)
}

function login(email: string, secret: string = password, requestOrigin = origin) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
    body: JSON.stringify({ email, password: secret, role: 'professor' }),
  })
}

function cookie(response: Response) {
  return response.headers.get('Set-Cookie')?.split(';')[0] ?? ''
}

describe('Worker authentication with local D1', () => {
  it('authenticates a student with a secure server session and only returns the assigned team', async () => {
    const response = await login(student.toUpperCase())
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const setCookie = response.headers.get('Set-Cookie')
    expect(setCookie).toMatch(/^__Host-restaurant-session=/)
    for (const attribute of ['Secure', 'HttpOnly', 'SameSite=Lax']) expect(setCookie).toContain(attribute)
    const body = await response.json()
    expect(body).toMatchObject({ account: { role: 'student', teamId: 1 } })
    expect(body.account).not.toHaveProperty('passwordHash')
    const headers = { Cookie: cookie(response) }
    expect((await request('/auth/session', { headers })).status).toBe(200)

    const ownTeam = await request('/student/team?teamId=2', { headers })
    expect(await ownTeam.json()).toMatchObject({ team: { TeamID: 1, TeamName: 'Student Team' } })
    expect((await request('/student/team/2', { headers })).status).toBe(403)
    expect((await request('/professor/submissions', { headers })).status).toBe(403)
    const stored = await db.prepare('SELECT TokenHash FROM AuthSession').first<string>('TokenHash')
    expect(stored).toMatch(/^[a-f0-9]{64}$/)
    expect(stored).not.toBe(cookie(response).split('=')[1])
  })

  it('authenticates a professor and lists all teams with their submission status', async () => {
    const response = await login(professor)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ account: { role: 'professor', teamId: null } })
    const headers = { Cookie: cookie(response) }
    const submissions = await request('/professor/submissions', { headers })
    expect(submissions.status).toBe(200)
    expect(await submissions.json()).toEqual({
      submissions: [
        { TeamID: 2, TeamName: 'Other Team', FirmNumber: null, RoundNumber: 2, SubmittedAt: '2026-11-10T18:00:00Z' },
        { TeamID: 1, TeamName: 'Student Team', FirmNumber: null, RoundNumber: 2, SubmittedAt: null },
      ],
    })
    expect((await request('/student/team', { headers })).status).toBe(403)
  })

  it('returns the same generic error for wrong passwords and unknown accounts', async () => {
    const wrong = await login(student, 'incorrect')
    const unknown = await login('unknown@example.invalid')
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(await wrong.json()).toEqual(await unknown.json())
    expect(wrong.headers.has('Set-Cookie')).toBe(false)
  })

  it('rejects cross-origin writes and unauthenticated or forged sessions', async () => {
    expect((await login(student, password, 'https://other.example')).status).toBe(403)
    expect((await request('/student/team')).status).toBe(401)
    expect((await request('/professor/submissions')).status).toBe(401)
    expect((await request('/auth/session', {
      headers: { Cookie: `__Host-restaurant-session=${'0'.repeat(64)}` },
    })).status).toBe(401)
  })

  it('revokes a session on logout and rejects replay', async () => {
    const session = cookie(await login(student))
    expect(session).not.toBe('')
    const response = await request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: session, Origin: origin },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
    expect((await request('/auth/session', { headers: { Cookie: session } })).status).toBe(401)
  })

  it('rejects expired sessions', async () => {
    const session = cookie(await login(professor))
    expect(session).not.toBe('')
    await db.prepare('UPDATE AuthSession SET ExpiresAt = ? WHERE UserID = (SELECT UserID FROM User WHERE Email = ?)')
      .bind(1, professor).run()
    const response = await request('/auth/session', { headers: { Cookie: session } })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Session expired or invalid. Sign in again.' })
  })

  it('submits student decisions and downloads the saved RFI as a professor', async () => {
    const path = '/student/decisions/3'
    const exportPath = '/professor/rfi/3/1'
    await db.prepare('UPDATE Team SET FirmNumber = TeamID WHERE TeamID IN (1, 2)').run()
    expect((await request(exportPath)).status).toBe(401)
    expect((await request(path)).status).toBe(401)
    const professorCookie = cookie(await login(professor))
    expect((await request(path, { headers: { Cookie: professorCookie } })).status).toBe(403)
    expect((await request(exportPath, { headers: { Cookie: professorCookie } })).status).toBe(409)
    expect((await request('/professor/rfi/2/2', { headers: { Cookie: professorCookie } })).status).toBe(422)
    expect((await request('/professor/rfi/8/1', { headers: { Cookie: professorCookie } })).status).toBe(400)
    expect((await request('/professor/rfi/3/999', { headers: { Cookie: professorCookie } })).status).toBe(404)
    const session = cookie(await login(student))
    const headers = { Cookie: session, Origin: origin, 'Content-Type': 'application/json' }
    expect((await request(exportPath, { headers })).status).toBe(403)
    const initial: DecisionResponse = await (await request(path, { headers })).json()
    const steak = initial.catalog.find((item) => item.ItemName === 'STEAK')!
    const menu = [2, 1].map((PrepLevel) => ({
      MenuItemID: steak.MenuItemID, PrepLevel, OrderSize: 180, InternalPromotion: 25, SalesPrice: 12.5,
    }))
    const values = Object.fromEntries([...decisionFields, ...reportFields].map(({ key }) => [key, 0]))
    const write = (revision: string | null, submit: boolean, overrides = {}) => request(path, {
      method: 'POST', headers, body: JSON.stringify({ revision, submit, values, menu, teamId: 2, ...overrides }),
    })
    expect((await write(null, false, { values: { ...values, TimeDepositChange: 1.25 } })).status).toBe(400)
    const saved = await write(null, false)
    expect(saved.status).toBe(200)
    const { revision } = await saved.json()
    expect((await write(null, false, { menu: [] })).status).toBe(409)
    const draft = await (await request(path, { headers })).json()
    expect(draft).toMatchObject({ values, menu, revision, submittedAt: null })
    expect((await db.prepare('SELECT TeamID FROM TeamDecision WHERE RoundNumber = 3').all()).results)
      .toEqual([{ TeamID: 1 }])
    expect((await write(revision, true)).status).toBe(200)
    const submitted = await (await request(path, { headers })).json()
    expect(submitted.submittedAt).toEqual(expect.any(String))
    expect((await write(submitted.revision, false)).status).toBe(409)
    expect((await request('/auth/logout', { method: 'POST', headers })).status).toBe(204)
    const exportHeaders = { Cookie: cookie(await login(professor)) }
    const roster = await request('/professor/rfi/3', { headers: exportHeaders })
    expect(await roster.json()).toMatchObject({ teams: [
      { TeamID: 1, SubmittedAt: submitted.submittedAt }, { TeamID: 2, SubmittedAt: null },
    ] })
    const download = await request(exportPath, { headers: exportHeaders })
    expect(download.status).toBe(200)
    expect(download.headers.get('Content-Disposition')).toBe('attachment; filename="RFI1ME.TXT"')
    expect(download.headers.get('Cache-Control')).toBe('no-store')
    const file = await download.text()
    const records = file.split('\r\n')
    expect(records.slice(4, 6).map((record) => record.slice(32, 43).trim())).toEqual(['Sirloin', 'Burger'])
    expect(records[19].length).toBe(123)
    expect(file.endsWith('\r\n\r\n')).toBe(true)
    expect((await db.prepare('SELECT Revision FROM TeamDecision WHERE TeamID = 1 AND RoundNumber = 3').first())?.Revision)
      .toBe(submitted.revision)
  })

  it('rate limits repeated attempts before password verification', async () => {
    await db.prepare('UPDATE LoginRateLimit SET Attempts = 8').run()
    const response = await login(student)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('300')
  })
})
