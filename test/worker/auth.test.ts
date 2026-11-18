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
    let { revision } = await saved.json()
    let current: string = revision
    const limits: [string, number, number, RegExp][] = [
      ['StaffPerDay', 999.9, 1000, /Staff FTEs per day must be at most 999\.9/],
      ['HourlyCompensation', 999.99, 1000, /Hourly compensation and training \(\$\) must be at most 999\.99/],
      ['AmenitiesPerOrder', 99.99, 100, /Amenities per order \(\$\) must be at most 99\.99/],
      ['TimeDepositChange', -99999999, -100000000, /Time deposit change \(\$\) must be between -99,999,999 and 99,999,999/],
      ['NotePayableChange', 99999999, 100000000, /Note payable change \(\$\) must be between/],
    ]
    for (const [key, atLimit, overLimit, message] of limits) {
      const over = await write(null, false, { values: { ...values, [key]: overLimit } })
      expect(over.status).toBe(400)
      expect((await over.json()).error).toMatch(message)
      const at = await write(current, false, { values: { ...values, [key]: atLimit } })
      expect(at.status).toBe(200)
      current = (await at.json()).revision
    }
    const overSize = await write(null, false, { menu: [{ ...menu[0], OrderSize: 10000 }] })
    expect(overSize.status).toBe(400)
    expect((await overSize.json()).error).toMatch(/order size must be at most 9,999\.9/)
    const overPrice = await write(null, false, { menu: [{ ...menu[0], SalesPrice: 10000000 }] })
    expect(overPrice.status).toBe(400)
    expect((await overPrice.json()).error).toMatch(/sales price must be at most 9,999,999\.99/)
    const atMenu = await write(current, false, { menu: [{ ...menu[0], OrderSize: 9999.9, SalesPrice: 9999999.99 }] })
    expect(atMenu.status).toBe(200)
    current = (await atMenu.json()).revision
    const restored = await write(current, false)
    expect(restored.status).toBe(200)
    revision = (await restored.json()).revision
    const twice = await write(null, false, { menu: [menu[0], menu[0]] })
    expect(twice.status).toBe(400)
    expect((await twice.json()).error).toMatch(/same item and preparation twice/)
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

  it('previews and atomically imports an archived round, with authorization and explicit replacement', async () => {
    const archives = import.meta.glob<string>(
      '../../input-output/04_Q5-decisions/output-of-simulation/FR.LST',
      { eager: true, query: '?raw', import: 'default' },
    )
    const archive = Object.values(archives)[0]
    // Compact synthetic listing keeps the API test runnable without the local archive.
    const synthetic = [
      "Administrator's Summary; Example Period 5",
      ...[1, 2, 3, 4, 5].flatMap((firm) => [
        `Firm ${firm} Example Period 5`, 'SALES * ASSETS',
        'Food Sales 786013. 78.62', 'Beverage Sales 213763. 21.38',
        'Food Cost 232756. 29.61', 'Beverage cost 44493. 20.81',
        'OPERATING PROFIT 141579. 14.16', 'NET INCOME or LOSS 25932. 2.59',
        'per Day & Training/Hr. per Order Orders per Order per Order Customer Count',
        '27.0 16.50 1.50 36100. 21.77 5.92 407.',
        'Selection Sales Purchase Order Internal Cost per Cost of Orders Total',
        'Price & Prep. Size Promotion unit of purchase Goods Sold Sold Sales',
        '     STEAK            24.95    Filet      170.0 Gm.        1750.       20.09 Kg.         28.7 %      5291.    132010.',
        '',
      ]),
      'Market Area   Affiliation', ...[1, 2, 3, 4, 5].map((firm) => `Firm ${firm} ME Example B1`),
    ].join('\r\n')
    const source = archive ?? synthetic

    const studentCookie = cookie(await login(student))
    const professorCookie = cookie(await login(professor))
    const upload = (action: string, options: {
      token?: string; replace?: boolean; text?: string; name?: string; round?: number; session?: string
    } = {}) => {
      const form = new FormData()
      form.set('file', new Blob([options.text ?? source]), options.name ?? 'FR.LST')
      if (options.token) form.set('token', options.token)
      if (options.replace) form.set('replace', 'yes')
      return request(`/professor/import/${options.round ?? 5}/${action}`, {
        method: 'POST', headers: { Origin: origin, Cookie: options.session ?? professorCookie }, body: form,
      })
    }
    expect((await upload('preview', { session: '' })).status).toBe(401)
    expect((await upload('preview', { session: studentCookie })).status).toBe(403)
    expect((await upload('preview', { round: 4 })).status).toBe(422)
    expect((await upload('preview', { name: 'FR.txt' })).status).toBe(400)
    expect((await upload('preview', { text: 'x'.repeat(256 * 1024 + 1) })).status).toBe(413)
    expect((await upload('preview')).status).toBe(422)

    await db.batch([
      db.prepare("UPDATE Team SET FirmNumber = TeamID WHERE TeamID IN (1, 2)"),
      db.prepare("INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES (3, 'Third', 3), (4, 'Fourth', 4), (5, 'Fifth', 5)"),
      db.prepare("INSERT INTO TeamDecision (TeamID, RoundNumber, SubmittedAt) VALUES (1, 5, 'submitted')"),
      db.prepare(`INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID,
        PrepLevel, OrderSize, InternalPromotion, SalesPrice)
        SELECT 1, 5, 2, MenuItemID, 3, 170, 1750, 24.95 FROM MenuItem WHERE ItemName = 'STEAK'`),
      db.prepare('INSERT INTO TeamMetrics VALUES (1, 4, 101, 0, 0, 0, 0, 0, 0, 0)'),
    ])
    const previewResponse = await upload('preview')
    expect(previewResponse.status).toBe(200)
    const preview = await previewResponse.json()
    expect(preview.teams).toHaveLength(5)
    expect(preview.teams[0].menu[0].DecisionSlot).toBe(2)
    expect(preview.teams[1].menu[0].DecisionSlot).toBeNull()
    expect((await db.prepare('SELECT COUNT(*) AS count FROM TeamMetrics WHERE RoundNumber = 5').first())?.count).toBe(0)

    await db.prepare(`CREATE TRIGGER test_import_failure BEFORE INSERT ON TeamMetrics
      WHEN NEW.TeamID = 5 AND NEW.RoundNumber = 5
      BEGIN SELECT RAISE(ABORT, 'test import failure'); END`).run()
    const failed = await upload('confirm', { token: preview.token })
    expect(failed.status).toBe(503)
    expect((await db.prepare('SELECT COUNT(*) AS count FROM SimulationResultImport').first())?.count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) AS count FROM TeamMetrics WHERE RoundNumber = 5').first())?.count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) AS count FROM MenuItemResult').first())?.count).toBe(0)
    await db.prepare('DROP TRIGGER test_import_failure').run()

    expect((await upload('confirm', { token: preview.token })).status).toBe(201)
    expect((await db.prepare('SELECT COUNT(*) AS count FROM TeamMetrics WHERE RoundNumber = 5').first())?.count).toBe(5)
    expect((await db.prepare('SELECT COUNT(*) AS count FROM MenuItemResult WHERE RoundNumber = 5').first())?.count)
      .toBe(preview.teams.reduce((total: number, team: { menu: unknown[] }) => total + team.menu.length, 0))
    expect((await upload('confirm', { token: preview.token })).status).toBe(409)
    const repeat = await (await upload('preview')).json()
    expect(repeat.alreadyImported).toBe(true)
    expect((await upload('confirm', { token: repeat.token })).status).toBe(200)

    const replacement = source.replace('786013.', '786014.')
    // Change a primary statement even when the first occurrence is in the administrator summary.
    const changed = replacement.replace(/(Food Sales +)786013\./, '$1786014.')
    const replacePreview = await (await upload('preview', { text: changed })).json()
    expect(replacePreview.replacesResults).toBe(true)
    expect((await upload('confirm', { token: replacePreview.token, text: changed })).status).toBe(409)
    expect((await upload('confirm', { token: replacePreview.token, text: changed, replace: true })).status).toBe(201)

    const studentResults = await request('/student/results/5?teamId=2', { headers: { Cookie: studentCookie } })
    expect(await studentResults.json()).toMatchObject({
      metrics: { TeamID: 1, RoundNumber: 5, FoodSales: 786014 },
      menu: expect.arrayContaining([expect.objectContaining({ ItemName: 'STEAK', PrepLevel: 3, OrdersSold: 5291 })]),
    })
    // The dashboard relies on these statuses: 404 for a round without an import, and role checks.
    expect((await request('/student/results/4', { headers: { Cookie: studentCookie } })).status).toBe(404)
    expect((await request('/student/results/6', { headers: { Cookie: studentCookie } })).status).toBe(404)
    expect((await request('/student/results/8', { headers: { Cookie: studentCookie } })).status).toBe(400)
    expect((await request('/student/results/5', { headers: { Cookie: professorCookie } })).status).toBe(403)
    expect((await request('/student/results/5')).status).toBe(401)
    expect((await db.prepare('SELECT FoodSales FROM TeamMetrics WHERE TeamID = 1 AND RoundNumber = 4').first())?.FoodSales).toBe(101)
    expect((await db.prepare('SELECT SalesPrice, OrdersSold FROM MenuItemDecision WHERE TeamID = 1 AND RoundNumber = 5').first()))
      .toEqual({ SalesPrice: 24.95, OrdersSold: null })
  })

  it('serves per-round leaderboard rows from imported rounds only, with no other fields', async () => {
    const studentCookie = cookie(await login(student))
    const professorCookie = cookie(await login(professor))
    await db.batch([
      // Round 6 is imported for teams 1 and 2 only; team 3's row there is not in the mapping.
      db.prepare("INSERT INTO SimulationResultImport VALUES (6, 'hash', '[[1,1],[2,2]]', '2026-11-18T00:00:00Z', 'w')"),
      db.prepare('INSERT INTO TeamMetrics VALUES (1, 6, 10, 5, 0, 0, 100, 1000, 7, 7)'),
      db.prepare('INSERT INTO TeamMetrics VALUES (2, 6, 20, 5, 0, 0, 200, 50000, 7, 7)'),
      db.prepare('INSERT INTO TeamMetrics VALUES (3, 6, 1, 1, 0, 0, 1, 999999, 7, 7)'),
    ])
    const response = await request('/student/leaderboard', { headers: { Cookie: studentCookie } })
    expect(response.status).toBe(200)
    // Round 4 (team 1, net income 0) has metrics but no import record, so it is not returned.
    // Round 5 comes from the import above (the real archive when present); round 6 is added here.
    // Rows are per round and carry only the agreed fields; the client adds them up.
    const round6: Record<number, [netIncome: number, revenue: number, profit: number]> = { 1: [1000, 15, 100], 2: [50000, 25, 200] }
    const { results: round5 } = await db.prepare(`SELECT t.TeamID, t.TeamName, t.FirmNumber, m.NetIncome,
      m.FoodSales + m.BeverageSales AS Revenue, m.OperatingProfit FROM TeamMetrics m JOIN Team t USING (TeamID)
      WHERE m.RoundNumber = 5`).all<{ TeamID: number; TeamName: string; FirmNumber: number; NetIncome: number; Revenue: number; OperatingProfit: number }>()
    const row = (roundNumber: number, team: { TeamID: number; TeamName: string; FirmNumber: number }, netIncome: number, revenue: number, profit: number) =>
      ({ TeamName: team.TeamName, FirmNumber: team.FirmNumber, IsOwn: team.TeamID === 1, RoundNumber: roundNumber, NetIncome: netIncome, Revenue: revenue, OperatingProfit: profit })
    const expected = [
      ...round5.map((team) => row(5, team, team.NetIncome, team.Revenue, team.OperatingProfit)),
      ...round5.filter((team) => round6[team.TeamID]).map((team) => {
        const [netIncome, revenue, profit] = round6[team.TeamID]
        return row(6, team, netIncome, revenue, profit)
      }),
    ].sort((a, b) => a.RoundNumber - b.RoundNumber || a.FirmNumber - b.FirmNumber || a.TeamName.localeCompare(b.TeamName))
    expect(round5).toHaveLength(5)
    expect(await response.json()).toEqual({ rows: expected })
    expect((await request('/student/leaderboard', { headers: { Cookie: professorCookie } })).status).toBe(403)
    expect((await request('/student/leaderboard')).status).toBe(401)
  })

  it('rate limits repeated attempts before password verification', async () => {
    await db.prepare('UPDATE LoginRateLimit SET Attempts = 8').run()
    const response = await login(student)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('300')
  })
})
