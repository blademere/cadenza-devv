import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: './apps/server/tests',
    setupFiles: ['./apps/server/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        // Current repository baseline. Keep these enforced while the template
        // is being refactored; raise them as feature coverage is added.
        lines: 50,
        functions: 30,
        branches: 30,
        statements: 50,
      },
      exclude: [
        'apps/server/src/server.js',
        'apps/server/src/platform/**',
        'apps/server/src/infrastructure/monitoring/**',
        '**/*.config.*',
      ],
    },
  },
})
