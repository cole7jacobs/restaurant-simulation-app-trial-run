import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [
    // React plugin is needed here too so Vitest can process JSX in test files
    react(),
  ],
  test: {
    // jsdom simulates a browser environment for React component tests
    environment: 'jsdom',
    // Expose Vitest globals (describe, it, expect, vi) without explicit imports
    globals: true,
    // Run the setup file before each test file
    setupFiles: ['./test/setup.ts'],
    // Explicit include pattern — covers both .ts and .tsx test files
    include: ['test/**/*.test.{ts,tsx}'],
  },
})
