import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const repositoryRoot = dirname(fileURLToPath(import.meta.url))
const serverTests = resolve(repositoryRoot, 'apps/server/tests')

export default defineConfig({
  test: {
    dir: serverTests,
    setupFiles: [resolve(serverTests, 'setup.js')],
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
