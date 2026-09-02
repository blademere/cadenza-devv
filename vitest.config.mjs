import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const repositoryRoot = dirname(fileURLToPath(import.meta.url))
const apiTests = resolve(repositoryRoot, 'apps/api/tests')

export default defineConfig({
  test: {
    dir: apiTests,
    setupFiles: [resolve(apiTests, 'setup.js')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 50,
        functions: 30,
        branches: 30,
        statements: 50,
      },
      exclude: [
        'apps/api/src/server.js',
        'apps/api/src/platform/**',
        'apps/api/src/infrastructure/monitoring/**',
        '**/*.config.*',
      ],
    },
  },
})
