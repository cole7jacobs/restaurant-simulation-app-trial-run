// Local-only bootstrap: derive reset snapshots from the validated presentation setup.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = resolve('.wrangler/presentation-demo-day')
if (process.argv.length !== 2 || !existsSync(target)) throw new Error('The fixed presentation-demo-day database must exist; no arguments are accepted.')
const name = `presentation-snapshot-${randomUUID()}`
const temp = resolve('.wrangler', name)
const wrangler = ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--persist-to', target]
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false' }
try {
  const existing = JSON.parse(execFileSync(process.execPath, [...wrangler, '--json', '--command', "SELECT COUNT(*) AS n FROM sqlite_schema WHERE name LIKE 'Presentation%'"], { encoding: 'utf8', env }))
  if (existing[0].results[0].n !== 0) throw new Error('Presentation snapshot tables already exist; refusing to overwrite them.')
  const teams = JSON.parse(execFileSync(process.execPath, [...wrangler, '--json', '--command', 'SELECT COUNT(*) AS n FROM Team WHERE TeamID BETWEEN 1 AND 5 AND TeamID = FirmNumber'], { encoding: 'utf8', env }))
  if (teams[0].results[0].n !== 5) throw new Error('The fixed database does not have the expected presentation team mapping.')
  execFileSync('node_modules/.bin/vite-node', ['scripts/prepare-presentation.ts', name], { stdio: 'pipe', env })
  const statements = readFileSync(resolve(temp, 'presentation-private.sql'), 'utf8').split('\n')
  const tables = ['TeamDecision', 'MenuItemDecision', 'SimulationResultImport', 'TeamMetrics', 'MenuItemResult']
  const sql = tables.map((table) => `CREATE TABLE Presentation${table} AS SELECT * FROM ${table} WHERE 0;`)
  for (const statement of statements) {
    const table = tables.find((item) => statement.startsWith(`INSERT INTO ${item} `))
    if (table) sql.push(statement.replace(`INSERT INTO ${table} `, `INSERT INTO Presentation${table} `))
  }
  sql.push("CREATE TABLE PresentationSnapshotMarker (id TEXT PRIMARY KEY);", "INSERT INTO PresentationSnapshotMarker VALUES ('presentation-demo-day-v1');")
  const file = resolve(temp, 'snapshot-install.sql')
  writeFileSync(file, sql.join('\n'), { mode: 0o600 })
  execFileSync(process.execPath, [...wrangler, '--file', file], { stdio: 'pipe', env })
  console.log('Installed local presentation reset snapshot; existing accounts and results were not changed.')
} finally { if (existsSync(temp)) rmSync(temp, { recursive: true, force: true }) }
