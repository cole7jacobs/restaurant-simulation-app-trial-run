import { expect, it } from 'vitest'

it('uses the JSDOM browser storage implementation', () => {
  const storage = window.localStorage
  expect(storage).toBeInstanceOf(window.Storage)
  storage.setItem('storage-check', 'demo draft')
  expect(window.localStorage.getItem('storage-check')).toBe('demo draft')
  storage.removeItem('storage-check')
  expect(window.localStorage.getItem('storage-check')).toBeNull()
})
