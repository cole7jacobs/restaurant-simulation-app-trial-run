import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from '../worker/password.mjs'

const staging = process.argv[2] === '--staging'
const [role, rawEmail, name, rawTeam, ...extra] = process.argv.slice(staging ? 3 : 2)
const email = rawEmail?.trim().toLowerCase()
const team = Number(rawTeam)
const student = role === 'student'
const validTeam = student
  ? /^-?\d+$/.test(rawTeam ?? '') && Number.isSafeInteger(team)
  : role === 'professor' && rawTeam === undefined

if (!validTeam || extra.length || !email || email.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name?.trim() || name.length > 100 || process.stdin.isTTY) {
  console.error('Usage: npm run account:create -- <student|professor> <email> "<name>" [team-id for student]')
  console.error('Supply the password through stdin. See the README for a hidden prompt.')
  process.exit(1)
}

const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '')
if (password.length < 15 || password.length > 256) {
  console.error('Use a password between 15 and 256 characters.')
  process.exit(1)
}

// Wrangler's SQL-file command has no bind API. Encode all text as SQLite
// hex literals so account fields cannot change the statement structure.
const text = (value) => `CAST(X'${Buffer.from(value).toString('hex')}' AS TEXT)`
const hash = await hashPassword(password)
const dir = mkdtempSync(join(tmpdir(), 'restaurant-account-'))
try {
  const file = join(dir, 'account.sql')
  writeFileSync(file, `INSERT INTO User (Email, PasswordHash, Name, Role, TeamID)
    VALUES (${text(email)}, ${text(hash)}, ${text(name.trim())}, ${text(role)}, ${student ? team : 'NULL'});`,
  { mode: 0o600 })
  const args = ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', ...(staging ? ['--remote', '--config', 'wrangler.staging.jsonc'] : ['--local']), '--file', file]
  if (!staging && process.env.LOCAL_D1_STATE) args.push('--persist-to', process.env.LOCAL_D1_STATE)
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
  if (result.status !== 0) {
    console.error('Account creation failed. Check that the database is migrated, the email is unused, and the student team exists.')
    process.exitCode = 1
  } else {
    console.log(`${staging ? 'Staging' : 'Local'} account created.`)
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}
