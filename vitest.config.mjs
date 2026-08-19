import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    dir: './tests',
    setupFiles: ['./tests/setup.js'],
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
        'src/server.js',
        'src/platform/**',
        'src/infrastructure/monitoring/**',
        '**/*.config.*',
      ],
    },
  },
})
