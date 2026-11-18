/**
 * Vitest global setup file.
 * Imported before every test file via vitest.config.ts `setupFiles`.
 *
 * Extends Vitest's `expect` with @testing-library/jest-dom matchers such as:
 *   toBeInTheDocument(), toHaveClass(), toBeDisabled(), toHaveValue(), etc.
 */
import '@testing-library/jest-dom'

// Vitest 2 can leave Node's experimental localStorage on its global proxy
// instead of forwarding JSDOM's implementation. Use the actual JSDOM storage
// so component tests exercise browser Storage on every supported Node version.
// Node-environment tests do not have a JSDOM instance.
const dom = (globalThis as typeof globalThis & {
  jsdom?: { window: { localStorage: Storage } }
}).jsdom
if (dom) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => dom.window.localStorage,
  })
}
