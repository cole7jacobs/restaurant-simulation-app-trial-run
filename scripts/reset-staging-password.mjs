// Staging-only operator tool. Password is read from stdin and never passed in argv.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashPassword } from '../worker/password.mjs'

const email = process.argv[2]?.trim().toLowerCase()
if (process.argv.length !== 3 || !email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.stdin.isTTY) {
  console.error('Usage: supply a password on stdin to node scripts/reset-staging-password.mjs <email>')
  process.exit(1)
}
const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '')
if (password.length < 15 || password.length > 256) {
  console.error('Use a password between 15 and 256 characters.')
  process.exit(1)
}
const text = value => `CAST(X'${Buffer.from(value).toString('hex')}' AS TEXT)`
const hash = await hashPassword(password)
const dir = mkdtempSync(join(tmpdir(), 'restaurant-staging-reset-'))
try {
  const file = join(dir, 'reset.sql')
  writeFileSync(file, `UPDATE User SET PasswordHash = ${text(hash)} WHERE Email = ${text(email)} COLLATE NOCASE;\nDELETE FROM AuthSession WHERE UserID IN (SELECT UserID FROM User WHERE Email = ${text(email)} COLLATE NOCASE);\n`, { mode: 0o600 })
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--remote', '--config', 'wrangler.staging.jsonc', '--file', file], { encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
  if (result.status !== 0) {
    console.error('Staging password reset failed; check Cloudflare access.')
    process.exitCode = 1
  } else console.log('Staging reset completed. Verify the account email exists before signing in.')
} finally { rmSync(dir, { recursive: true, force: true }) }
