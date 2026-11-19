// @vitest-environment node
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { unstable_splitSqlQuery } from 'wrangler'
import app from '../../worker/index'
import presentation from '../../worker/presentation-local'
import { parseListing } from '../../worker/fr-lst'

const migrations = import.meta.glob<string>('../../db/migrations/*.sql', { eager: true, query: '?raw', import: 'default' })
const q1 = import.meta.glob<string>('../../input-output/00_Q1-simulation-start/output-of-simulation/FR.LST', { eager: true, query: '?raw', import: 'default' })
const q2 = import.meta.glob<string>('../../input-output/01_Q2-decisions/output-of-simulation/FR.LST', { eager: true, query: '?raw', import: 'default' })
const synthetic = (round: number) => [
  `Administrator's Summary; Example Period ${round}`,
  ...[1, 2, 3, 4, 5].flatMap((firm) => [
    `Firm ${firm} Example Period ${round}`, 'SALES * ASSETS',
    `Food Sales ${1000 + firm}. 78.62`, 'Beverage Sales 200. 21.38', 'Food Cost 100. 29.61', 'Beverage cost 40. 20.81',
    `OPERATING PROFIT ${200 + firm}. 14.16`, `NET INCOME or LOSS ${firm - 3}. 2.59`,
    'per Day & Training/Hr. per Order Orders per Order per Order Customer Count', '27.0 16.50 1.50 36100. 21.77 5.92 407.',
    'Selection Sales Purchase Order Internal Cost per Cost of Orders Total',
    'Price & Prep. Size Promotion unit of purchase Goods Sold Sold Sales',
    '     STEAK            24.95    Filet      170.0 Gm.        1750.       20.09 Kg.         28.7 %      5291.    132010.', '',
  ]),
  'Market Area   Affiliation', ...[1, 2, 3, 4, 5].map((firm) => `Firm ${firm} ME Example B1`),
].join('\r\n')
const source1 = Object.values(q1)[0] ?? synthetic(1), source2 = Object.values(q2)[0] ?? synthetic(2)
let runtime: Miniflare
let db: Awaited<ReturnType<Miniflare['getD1Database']>>
const student = 'a'.repeat(64), professor = 'b'.repeat(64), outsider = 'c'.repeat(64), origin = 'http://localhost:8787'
async function hash(token: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map((b) => b.toString(16).padStart(2, '0')).join('') }
const request = (path: string, token?: string, init: RequestInit = {}) => app.fetch(new Request(origin + '/api' + path, { ...init, headers: { Origin: origin, ...(token ? { Cookie: `restaurant-local-session=${token}` } : {}), ...init.headers } }), { DB: db } as never)
async function doImport(round: number, source: string) {
  const form = (token?: string) => { const body = new FormData(); body.set('file', new Blob([source]), 'FR.LST'); if (token) body.set('token', token); return body }
  const result = await request(`/professor/import/${round}/preview`, professor, { method: 'POST', body: form() })
  expect(result.status).toBe(200)
  const preview = await result.json() as { token: string }
  expect((await request(`/professor/import/${round}/confirm`, professor, { method: 'POST', body: form(preview.token) })).status).toBe(201)
}
beforeAll(async () => {
  runtime = new Miniflare({ modules: true, script: 'export default {fetch:()=>new Response(null)}', d1Databases: ['DB'], d1Persist: false })
  db = await runtime.getD1Database('DB')
  for (const name of Object.keys(migrations).sort()) await db.batch(unstable_splitSqlQuery(migrations[name]).map((sql) => db.prepare(sql)))
  await db.batch([
    ...[1, 2, 3, 4, 5].map((n) => db.prepare('INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES (?, ?, ?)').bind(n, `Restaurant ${n}`, n)),
    db.prepare("INSERT INTO Team (TeamID, TeamName) VALUES (6, 'Unmapped team')"),
    db.prepare("INSERT INTO User (UserID, Email, PasswordHash, Name, Role, TeamID) VALUES (1,'s@example.invalid','hash','Student','student',1), (2,'p@example.invalid','hash','Professor','professor',NULL), (3,'other@example.invalid','hash','Other','student',6)"),
    db.prepare('INSERT INTO AuthSession (TokenHash, UserID, ExpiresAt) VALUES (?, 1, ?), (?, 2, ?), (?, 3, ?)').bind(await hash(student), 9999999999, await hash(professor), 9999999999, await hash(outsider), 9999999999),
  ])
}, 15000)
afterAll(async () => { await runtime?.dispose() })

it('exposes only complete imported results and follows Q1 import, Q2 import and presentation reset', async () => {
  expect((await request('/student/leaderboard/1')).status).toBe(401)
  expect((await request('/professor/leaderboard/1', student)).status).toBe(403)
  expect((await request('/student/leaderboard/2', student)).status).toBe(404)
  expect((await request('/student/leaderboard/8', student)).status).toBe(400)
  await doImport(1, source1)
  let response = await request('/student/leaderboard/1', student)
  expect(response.status).toBe(200)
  const first = await response.json() as { teams: Array<{ firmNumber: number; netIncome: number; foodSales: number; beverageSales: number }> }
  expect(first.teams).toHaveLength(5)
  for (const expected of parseListing(source1).firms) {
    expect(first.teams.find((team) => team.firmNumber === expected.firm)).toMatchObject({
      netIncome: expected.metrics.NetIncome, operatingProfit: expected.metrics.OperatingProfit,
      foodSales: expected.metrics.FoodSales, beverageSales: expected.metrics.BeverageSales,
    })
  }
  const firm1 = parseListing(source1).firms[0]
  expect(first.teams.find((team) => team.firmNumber === 1)).toMatchObject({ netIncome: firm1.metrics.NetIncome, foodSales: firm1.metrics.FoodSales, beverageSales: firm1.metrics.BeverageSales })
  expect((await request('/professor/leaderboard/1', professor)).status).toBe(200)
  expect((await request('/student/results/1', outsider)).status).toBe(404)
  expect((await request('/student/leaderboard/1', outsider)).status).toBe(404)
  for (const table of ['TeamDecision', 'MenuItemDecision', 'SimulationResultImport', 'TeamMetrics', 'MenuItemResult']) await db.prepare(`CREATE TABLE Presentation${table} AS SELECT * FROM ${table}`).run()
  await db.batch([db.prepare('CREATE TABLE PresentationSnapshotMarker (id TEXT PRIMARY KEY)'), db.prepare("INSERT INTO PresentationSnapshotMarker VALUES ('presentation-demo-day-v1')")])
  await doImport(2, source2)
  response = await request('/student/leaderboard/2', student)
  expect(response.status).toBe(200)
  const second = await response.json() as { teams: Array<{ firmNumber: number; netIncome: number }> }
  expect(second.teams.find((team) => team.firmNumber === 1)?.netIncome).toBe(parseListing(source2).firms[0].metrics.NetIncome)
  expect((await request('/student/leaderboard/1', student)).status).toBe(200)
  await db.prepare('DELETE FROM MenuItemResult WHERE TeamID = 5 AND RoundNumber = 2').run()
  await db.prepare('DELETE FROM TeamMetrics WHERE TeamID = 5 AND RoundNumber = 2').run()
  expect((await request('/student/leaderboard/2', student)).status).toBe(404)
  const reset = await presentation.fetch(new Request(origin + '/api/professor/presentation/reset', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: `restaurant-local-session=${professor}` }, body: JSON.stringify({ confirm: 'reset-presentation' }) }), { DB: db } as never)
  expect(reset.status).toBe(200)
  expect((await request('/student/leaderboard/2', student)).status).toBe(404)
  expect((await request('/student/leaderboard/1', student)).status).toBe(200)
})
