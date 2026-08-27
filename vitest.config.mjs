import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const repositoryRoot = dirname(fileURLToPath(import.meta.url))
const serverTests = resolve(repositoryRoot, 'apps/server/tests')

export default defineConfig({
  test: {
    dir: serverTests,
    // The server is CommonJS. Run Vitest through Node's native module loader
    // so CommonJS require() follows production semantics and vi.mock() can
    // intercept the repository/service dependencies used by these tests.
    experimental: {
      viteModuleRunner: false,
    },
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
