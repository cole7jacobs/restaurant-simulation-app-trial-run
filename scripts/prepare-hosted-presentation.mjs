// Generate a private seed file locally. This script makes no remote calls.
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const output = resolve('.wrangler/hosted-presentation-seed.sql')
if (process.argv.length !== 2 || existsSync(output)) throw new Error('No arguments accepted; remove or inspect the existing private seed file before regenerating it.')
const name = `presentation-hosted-prep-${randomUUID()}`
const temp = resolve('.wrangler', name)
try {
  execFileSync('node_modules/.bin/vite-node', ['scripts/prepare-presentation.ts', name], { stdio: 'pipe', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
  const records = readFileSync(resolve(temp, 'presentation-private.sql'), 'utf8')
  const tables = ['TeamDecision', 'MenuItemDecision', 'SimulationResultImport', 'TeamMetrics', 'MenuItemResult']
  const snapshots = tables.map((table) => `CREATE TABLE Presentation${table} AS SELECT * FROM ${table};`)
  snapshots.push("CREATE TABLE PresentationSnapshotMarker (id TEXT PRIMARY KEY);", "INSERT INTO PresentationSnapshotMarker VALUES ('presentation-demo-day-v1');")
  writeFileSync(output, `${records}\n${snapshots.join('\n')}\n`, { mode: 0o600, flag: 'wx' })
  console.log(`Prepared private local seed: ${output}. Nothing was uploaded.`)
} finally { if (existsSync(temp)) rmSync(temp, { recursive: true, force: true }) }
