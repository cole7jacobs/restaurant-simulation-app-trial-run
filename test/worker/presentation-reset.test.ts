// @vitest-environment node
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { unstable_splitSqlQuery } from 'wrangler'
import local from '../../worker/presentation-local'
import deployed from '../../worker/index'

const migrations = import.meta.glob<string>('../../db/migrations/*.sql', { eager: true, query: '?raw', import: 'default' })
let runtime: Miniflare
let db: Awaited<ReturnType<Miniflare['getD1Database']>>
const student = 'a'.repeat(64), professor = 'b'.repeat(64)
async function hash(token: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map((b) => b.toString(16).padStart(2, '0')).join('') }
beforeAll(async () => {
  runtime = new Miniflare({ modules: true, script: 'export default { fetch: () => new Response(null) }', d1Databases: ['DB'], d1Persist: false })
  db = await runtime.getD1Database('DB')
  for (const name of Object.keys(migrations).sort()) await db.batch(unstable_splitSqlQuery(migrations[name]).map((sql) => db.prepare(sql)))
  await db.batch([
    ...[1, 2, 3, 4, 5].map((n) => db.prepare('INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES (?, ?, ?)').bind(n, `Firm ${n}`, n)),
    db.prepare("INSERT INTO User (UserID, Email, PasswordHash, Name, Role, TeamID) VALUES (1,'s@example.invalid','hash','Student','student',1), (2,'p@example.invalid','hash','Professor','professor',NULL)"),
    db.prepare('INSERT INTO AuthSession (TokenHash, UserID, ExpiresAt) VALUES (?, 1, ?), (?, 2, ?)').bind(await hash(student), 9999999999, await hash(professor), 9999999999),
    db.prepare("INSERT INTO TeamDecision (TeamID, RoundNumber, StaffPerDay, Revision) VALUES (1, 2, 29, 'original')"),
    db.prepare("INSERT INTO TeamMetrics VALUES (1,1,100,1,1,1,1,1,1,1)"),
    db.prepare("INSERT INTO SimulationResultImport VALUES (1,'hash','[[1,1]]','time','id')"),
  ])
  for (const table of ['TeamDecision', 'MenuItemDecision', 'SimulationResultImport', 'TeamMetrics', 'MenuItemResult']) await db.prepare(`CREATE TABLE Presentation${table} AS SELECT * FROM ${table}`).run()
  await db.batch([
    db.prepare("CREATE TABLE PresentationSnapshotMarker (id TEXT PRIMARY KEY)"),
    db.prepare("INSERT INTO PresentationSnapshotMarker VALUES ('presentation-demo-day-v1')"),
    db.prepare("UPDATE TeamDecision SET StaffPerDay=32.5, SubmittedAt='done' WHERE TeamID=1 AND RoundNumber=2"),
    db.prepare("UPDATE TeamMetrics SET FoodSales=999 WHERE TeamID=1 AND RoundNumber=1"),
    db.prepare("INSERT INTO TeamMetrics VALUES (1,2,200,1,1,1,1,1,1,1)"),
    db.prepare("INSERT INTO SimulationResultImport VALUES (2,'hash','[[1,1]]','time','id')"),
  ])
}, 15000)
afterAll(async () => { await runtime?.dispose() })

it('requires local professor authentication and explicit confirmation, then restores the snapshot without touching sessions', async () => {
  const send = (token: string | null, confirm: boolean, url = 'http://localhost:8787') => local.fetch(new Request(url + '/api/professor/presentation/reset', { method: 'POST', headers: { Origin: url, 'Content-Type': 'application/json', ...(token ? { Cookie: `restaurant-local-session=${token}` } : {}) }, body: JSON.stringify({ confirm: confirm ? 'reset-presentation' : false }) }), { DB: db } as never)
  expect((await send(null, true)).status).toBe(401)
  expect((await send(student, true)).status).toBe(403)
  expect((await send(professor, false)).status).toBe(400)
  expect((await send(professor, true, 'https://example.com')).status).toBe(404)
  const normal = await deployed.fetch(new Request('https://example.com/api/professor/presentation/reset', { method: 'POST', headers: { Origin: 'https://example.com', Cookie: `__Host-restaurant-session=${professor}` } }), { DB: db } as never)
  expect(normal.status).toBe(404)
  expect((await send(professor, true)).status).toBe(200)
  expect(await db.prepare('SELECT StaffPerDay, SubmittedAt FROM TeamDecision WHERE TeamID=1 AND RoundNumber=2').first()).toEqual({ StaffPerDay: 29, SubmittedAt: null })
  expect(await db.prepare('SELECT FoodSales FROM TeamMetrics WHERE TeamID=1 AND RoundNumber=1').first('FoodSales')).toBe(100)
  expect(await db.prepare('SELECT COUNT(*) AS n FROM TeamMetrics WHERE RoundNumber=2').first('n')).toBe(0)
  expect(await db.prepare('SELECT COUNT(*) AS n FROM AuthSession').first('n')).toBe(2)
  expect(await db.prepare('SELECT COUNT(*) AS n FROM User').first('n')).toBe(2)
})
