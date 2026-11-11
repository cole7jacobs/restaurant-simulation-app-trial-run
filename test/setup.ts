/**
 * Vitest global setup file.
 * Imported before every test file via vitest.config.ts `setupFiles`.
 *
 * Extends Vitest's `expect` with @testing-library/jest-dom matchers such as:
 *   toBeInTheDocument(), toHaveClass(), toBeDisabled(), toHaveValue(), etc.
 */
import '@testing-library/jest-dom'
