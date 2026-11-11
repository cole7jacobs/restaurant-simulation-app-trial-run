import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// 32 MiB per derivation with three parallelization passes.
const options = { N: 32768, r: 8, p: 3, maxmem: 48 * 1024 * 1024 }
const format = 'scrypt-v1'
const dummy = `${format}$${'00'.repeat(16)}$${'00'.repeat(32)}`

function derive(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, options, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt)
  return `${format}$${salt}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const valid = typeof stored === 'string' && /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored)
  const [, salt, expected] = (valid ? stored : dummy).split('$')
  const key = await derive(password, salt)
  const bytes = Uint8Array.from(expected.match(/../g), (pair) => Number.parseInt(pair, 16))
  return timingSafeEqual(key, bytes) && valid
}
