import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
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
