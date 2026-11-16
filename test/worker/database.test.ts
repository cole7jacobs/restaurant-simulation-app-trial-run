// @vitest-environment node
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unstable_splitSqlQuery } from 'wrangler'
import app from '../../worker/index'
import seed from '../../db/seed.dev.sql?raw'

type Database = Awaited<ReturnType<Miniflare['getD1Database']>>

const migrations = import.meta.glob<string>('../../db/migrations/*.sql', {
  eager: true, query: '?raw', import: 'default',
})
const tables = ['MenuItem', 'MenuItemDecision', 'Team', 'TeamDecision', 'TeamMetrics', 'User']

let runtime: Miniflare
let db: Database

async function applySql(source: string) {
  const statements = unstable_splitSqlQuery(source)
  await db.batch(statements.map((sql) => db.prepare(sql)))
}

beforeAll(async () => {
  runtime = new Miniflare({
    modules: true,
    script: 'export default { fetch: () => new Response(null) }',
    compatibilityDate: '2025-04-01',
    d1Databases: ['DB'],
    d1Persist: false,
  })
  db = await runtime.getD1Database('DB')
  for (const file of Object.keys(migrations).sort()) await applySql(migrations[file])
}, 15000)

afterAll(async () => {
  await runtime?.dispose()
})

describe('local D1 migrations and relationships', () => {
  it('creates all six tables and reports readiness through Hono with a real D1 binding', async () => {
    const schema = await db.prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).all<{ name: string }>()
    expect(schema.results.map(({ name }) => name).filter((name) => tables.includes(name))).toEqual(tables)

    const env = { DB: db } as unknown as Parameters<typeof app.fetch>[1]
    const response = await app.fetch(new Request('http://localhost/api/health/db'), env)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('creates a team and retrieves its student membership', async () => {
    const team = await db.prepare('INSERT INTO Team (TeamName) VALUES (?) RETURNING TeamID, TeamName, FirmNumber')
      .bind('Test Bistro').first<{ TeamID: number }>()
    expect(team).toMatchObject({ TeamName: 'Test Bistro', FirmNumber: null })

    await db.prepare('INSERT INTO User (Email, PasswordHash, Name, Role, TeamID) VALUES (?, ?, ?, ?, ?)')
      .bind('student@example.invalid', 'test-fixture-disabled', 'Example Student', 'student', team!.TeamID).run()

    const membership = await db.prepare(
      'SELECT Name, Role, TeamName FROM User JOIN Team USING (TeamID) WHERE Email = ?',
    ).bind('student@example.invalid').first()
    expect(membership).toEqual({ Name: 'Example Student', Role: 'student', TeamName: 'Test Bistro' })
  })

  it('stores drafts, menu decisions, and round results and retrieves them together', async () => {
    const team = 100
    const round = 2
    const item = 100

    await db.batch([
      db.prepare('INSERT INTO Team (TeamID, TeamName) VALUES (?, ?)').bind(team, 'Draft Team'),
      db.prepare('INSERT INTO MenuItem (MenuItemID, ItemName, OrderSizeUnit) VALUES (?, ?, ?)').bind(item, 'Test Item', 'Gm.'),
      db.prepare('INSERT INTO TeamDecision (TeamID, RoundNumber, StaffPerDay, NotePayableChange) VALUES (?, ?, ?, ?)').bind(team, round, 12.5, -200),
      db.prepare(`INSERT INTO MenuItemDecision
        (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)`).bind(team, round, item, 2, 180, 0, 24.95),
      db.prepare(`INSERT INTO TeamMetrics
        (TeamID, RoundNumber, FoodSales, BeverageSales, FoodCost, BeverageCost, OperatingProfit,
         NetIncome, FoodOrders, AvgDailyCustomerCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(team, round, 400, 80, 100, 10, 35, -5, 25, 10),
    ])

    const roundData = await db.prepare(`
      SELECT SubmittedAt, StaffPerDay, NotePayableChange, ItemName, SalesPrice, OrdersSold, NetIncome
      FROM TeamDecision
      JOIN MenuItemDecision USING (TeamID, RoundNumber)
      JOIN MenuItem USING (MenuItemID)
      JOIN TeamMetrics USING (TeamID, RoundNumber)
      WHERE TeamID = ? AND RoundNumber = ?
    `).bind(team, round).first()

    expect(roundData).toEqual({
      SubmittedAt: null, StaffPerDay: 12.5, NotePayableChange: -200,
      ItemName: 'Test Item', SalesPrice: 24.95, OrdersSold: null, NetIncome: -5,
    })
  })

  it('rejects orphan references, invalid values, and duplicate keys', async () => {
    await db.batch([
      db.prepare("INSERT INTO Team (TeamID, TeamName, FirmNumber) VALUES (200, 'Constraint Team', 6)"),
      db.prepare('INSERT INTO TeamDecision (TeamID, RoundNumber) VALUES (200, 1)'),
      db.prepare("INSERT INTO MenuItem (MenuItemID, ItemName, OrderSizeUnit) VALUES (200, 'Constraint Item', 'Cl.')"),
      db.prepare('INSERT INTO MenuItemDecision VALUES (200, 1, 1, 200, 2, 20, 0, 5, NULL, NULL, NULL)'),
    ])

    const rejected = [
      [`INSERT INTO User (Email, PasswordHash, Name, Role, TeamID)
        VALUES ('orphan@example.invalid', 'test-fixture-disabled', 'Orphan', 'student', 999)`, /FOREIGN KEY/],
      ['INSERT INTO TeamDecision (TeamID, RoundNumber) VALUES (999, 1)', /FOREIGN KEY/],
      ['INSERT INTO MenuItemDecision VALUES (200, 2, 1, 200, 2, 20, 0, 5, NULL, NULL, NULL)', /FOREIGN KEY/],
      ['INSERT INTO MenuItemDecision VALUES (200, 1, 2, 999, 2, 20, 0, 5, NULL, NULL, NULL)', /FOREIGN KEY/],
      ['INSERT INTO TeamMetrics VALUES (999, 1, 0, 0, 0, 0, 0, 0, 0, 0)', /FOREIGN KEY/],
      ['INSERT INTO TeamDecision (TeamID, RoundNumber) VALUES (200, 1)', /UNIQUE/],
      ['INSERT INTO MenuItemDecision VALUES (200, 1, 1, 200, 2, 20, 0, 5, NULL, NULL, NULL)', /UNIQUE/],
      ['INSERT INTO MenuItemDecision VALUES (200, 1, 2, 200, 2, 20, 0, 5, NULL, NULL, NULL)', /UNIQUE/],
      ["INSERT INTO Team (TeamName, FirmNumber) VALUES ('Duplicate Firm', 6)", /UNIQUE/],
      ['INSERT INTO Team (FirmNumber) VALUES (7)', /NOT NULL/],
      ['UPDATE TeamDecision SET ReportFinancial = 2 WHERE TeamID = 200', /CHECK/],
      ['UPDATE MenuItemDecision SET PrepLevel = 4 WHERE TeamID = 200', /CHECK/],
      ['UPDATE MenuItemDecision SET SalesPrice = -1 WHERE TeamID = 200', /CHECK/],
      ["UPDATE TeamDecision SET StaffPerDay = 'invalid' WHERE TeamID = 200", /cannot store/i],
    ] as const

    // Same item with a different preparation is still allowed.
    await db.prepare('INSERT INTO MenuItemDecision VALUES (200, 1, 3, 200, 1, 20, 0, 5, NULL, NULL, NULL)').run()

    for (const [sql, error] of rejected) await expect(db.prepare(sql).run(), sql).rejects.toThrow(error)
    expect((await db.prepare('PRAGMA foreign_key_check').all()).results).toEqual([])
  })

  it('reruns the development seed without duplicates or overwriting edited rows', async () => {
    await applySql(seed)
    await db.prepare('UPDATE TeamDecision SET StaffPerDay = ? WHERE TeamID = ? AND RoundNumber = ?')
      .bind(15, -1, 2).run()
    await applySql(seed)

    const counts = await db.prepare(`
      SELECT (SELECT COUNT(*) FROM Team WHERE TeamID < 0) AS teams,
        (SELECT COUNT(*) FROM MenuItem WHERE MenuItemID NOT IN (100, 200)) AS menuItems,
        (SELECT COUNT(*) FROM TeamDecision WHERE TeamID < 0) AS decisions,
        (SELECT COUNT(*) FROM MenuItemDecision WHERE TeamID < 0) AS menuDecisions,
        (SELECT COUNT(*) FROM TeamMetrics WHERE TeamID < 0) AS results
    `).first()
    expect(counts).toEqual({ teams: 5, menuItems: 13, decisions: 2, menuDecisions: 2, results: 1 })
    expect(await db.prepare('SELECT StaffPerDay FROM TeamDecision WHERE TeamID = ? AND RoundNumber = ?')
      .bind(-1, 2).first('StaffPerDay')).toBe(15)
  })
})

describe('migration 0005 cleanup of duplicate menu selections', () => {
  it('removes duplicates, keeps the lowest slot, clears result links, and enforces uniqueness', async () => {
    const files = Object.keys(migrations).sort()
    const migrationDb = new Miniflare({
      modules: true,
      script: 'export default { fetch: () => new Response(null) }',
      compatibilityDate: '2025-04-01',
      d1Databases: ['DB'],
      d1Persist: false,
    })
    try {
      const target = await migrationDb.getD1Database('DB')
      const apply = async (source: string) =>
        target.batch(unstable_splitSqlQuery(source).map((sql) => target.prepare(sql)))
      for (const file of files.filter((name) => /\/000[1-4]_/.test(name))) await apply(migrations[file])

      // Slots 1, 2 and 4 repeat item 300 with preparation 1; slot 3 is the same item with preparation 2.
      await target.batch([
        target.prepare("INSERT INTO Team (TeamID, TeamName) VALUES (300, 'Duplicate Team')"),
        target.prepare("INSERT INTO MenuItem (MenuItemID, ItemName, OrderSizeUnit) VALUES (300, 'Duplicate Item', 'Gm.')"),
        target.prepare('INSERT INTO TeamDecision (TeamID, RoundNumber) VALUES (300, 1)'),
        target.prepare('INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (300, 1, 1, 300, 1, 100, 0, 5)'),
        target.prepare('INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (300, 1, 2, 300, 1, 110, 0, 6)'),
        target.prepare('INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (300, 1, 3, 300, 2, 120, 0, 7)'),
        target.prepare('INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (300, 1, 4, 300, 1, 130, 0, 8)'),
        target.prepare('INSERT INTO TeamMetrics VALUES (300, 1, 0, 0, 0, 0, 0, 0, 0, 0)'),
        // Result 1 points at the kept slot; result 2 points at the duplicate slot 2.
        target.prepare('INSERT INTO MenuItemResult (TeamID, RoundNumber, ResultSlot, MenuItemID, PrepLevel, DecisionSlot, CostOfGoodsSoldPct, OrdersSold, TotalSales) VALUES (300, 1, 1, 300, 1, 1, 30, 1, 5)'),
        target.prepare('INSERT INTO MenuItemResult (TeamID, RoundNumber, ResultSlot, MenuItemID, PrepLevel, DecisionSlot, CostOfGoodsSoldPct, OrdersSold, TotalSales) VALUES (300, 1, 2, 300, 1, 2, 30, 1, 6)'),
      ])

      await apply(migrations[files.find((name) => name.includes('0005_'))!])

      const slots = await target.prepare('SELECT SlotNumber, PrepLevel FROM MenuItemDecision WHERE TeamID = 300 ORDER BY SlotNumber')
        .all<{ SlotNumber: number; PrepLevel: number }>()
      expect(slots.results).toEqual([{ SlotNumber: 1, PrepLevel: 1 }, { SlotNumber: 3, PrepLevel: 2 }])

      const links = await target.prepare('SELECT ResultSlot, DecisionSlot FROM MenuItemResult WHERE TeamID = 300 ORDER BY ResultSlot')
        .all<{ ResultSlot: number; DecisionSlot: number | null }>()
      expect(links.results).toEqual([{ ResultSlot: 1, DecisionSlot: 1 }, { ResultSlot: 2, DecisionSlot: null }])

      await expect(
        target.prepare('INSERT INTO MenuItemDecision (TeamID, RoundNumber, SlotNumber, MenuItemID, PrepLevel, OrderSize, InternalPromotion, SalesPrice) VALUES (300, 1, 5, 300, 1, 100, 0, 5)').run(),
      ).rejects.toThrow(/UNIQUE/)
    } finally {
      await migrationDb.dispose()
    }
  }, 15000)
})
