import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const rules = require('../../../scripts/architecture-rules.cjs')

describe('architecture rules', () => {
  it('blocks platform imports from features and modules', () => {
    expect(rules.getLayerViolations(
      'apps/api/src/platform/example/example.service.js',
      "import x from '../../features/example/example.service.js'",
    )).toContain(
      'apps/api/src/platform/example/example.service.js: platform code must not import features or modules.',
    )

    expect(rules.getLayerViolations(
      'apps/api/src/platform/example/example.service.js',
      "import x from '../../modules/obo/example.service.js'",
    )).toContain(
      'apps/api/src/platform/example/example.service.js: platform code must not import features or modules.',
    )
  })

  it('blocks feature and infrastructure imports from modules', () => {
    expect(rules.getLayerViolations(
      'apps/api/src/features/example/example.service.js',
      "import x from '../../modules/obo/example.service.js'",
    )).toContain(
      'apps/api/src/features/example/example.service.js: shared features must not import modules.',
    )

    expect(rules.getLayerViolations(
      'apps/api/src/infrastructure/example.js',
      "import x from '../../modules/obo/example.service.js'",
    )).toContain(
      'apps/api/src/infrastructure/example.js: infrastructure must not import modules.',
    )
  })

  it('blocks new direct Prisma access from platform services', () => {
    const violations = rules.getLayerViolations(
      'apps/api/src/platform/example/example.service.js',
      "import { getPrismaClient } from '../../infrastructure/database/prisma.js'\nconst prisma = getPrismaClient()",
    )

    expect(violations).toContain(
      'apps/api/src/platform/example/example.service.js: platform services must not access Prisma directly; use a repository or explicit infrastructure boundary.',
    )
  })

  it('keeps explicit legacy Prisma exceptions bounded', () => {
    const legacyPath = 'apps/api/src/platform/workflow/workflow.service.js'

    expect(rules.isPlatformPrismaLegacyException(legacyPath)).toBe(true)
    expect(rules.getLayerViolations(
      legacyPath,
      "import { getPrismaClient } from '../../infrastructure/database/prisma.js'\nconst prisma = getPrismaClient()",
    )).not.toContain(
      `${legacyPath}: platform services must not access Prisma directly; use a repository or explicit infrastructure boundary.`,
    )

    expect(rules.isPlatformPrismaLegacyException(
      'apps/api/src/platform/workflow/new-workflow.service.js',
    )).toBe(false)
  })

  it('allows repositories to own direct Prisma access', () => {
    expect(rules.getLayerViolations(
      'apps/api/src/platform/workflow/workflow.repository.js',
      "import { getPrismaClient } from '../../infrastructure/database/prisma.js'\nconst prisma = getPrismaClient()",
    )).toEqual([])
  })
})
