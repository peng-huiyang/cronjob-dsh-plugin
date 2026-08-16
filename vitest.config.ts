import { defineConfig } from 'vitest/config'

// Unit lane: fast, no network, no real harness. The live end-to-end checks
// live in the M5 manual smoke instead of this config.
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: ['**/node_modules/**'],
    pool: 'forks',
    testTimeout: 20_000,
  },
})
