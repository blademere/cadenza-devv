import { describe, expect, it } from 'vitest'
import {
  getApplicationSecurityViolations,
  getLayerViolations,
  isApplicationScopedRepository,
} from '../../../scripts/architecture-rules.cjs'

describe('application architecture enforcement', () => {
  it('rejects shared features importing application code', () => {
    const failures = getLayerViolations(
      'apps/api/src/features/cases/cases.service.js',
      "import { createPermit } from '../../apps/obo/plan-permits/service.js'",
    )
    expect(failures).toContain(
      'apps/api/src/features/cases/cases.service.js: shared features must not import modules or apps.',
    )
  })

  it('rejects platform code importing application code', () => {
    const failures = getApplicationSecurityViolations(
      'apps/api/src/platform/forms/form.service.js',
      "import { oboPolicy } from '../../../apps/obo/authorization/policy.js'",
    )
    expect(failures).toContain(
      'apps/api/src/platform/forms/form.service.js: shared features and platform must not import application code; application composition belongs in apps/.',
    )
  })

  it('rejects application-scoped repositories without an ownership boundary', () => {
    const relative = 'apps/api/src/features/cases/cases.repository.js'
    expect(isApplicationScopedRepository(relative)).toBe(true)
    const failures = getApplicationSecurityViolations(relative, 'const find = () => prisma.caseRecord.findUnique({ where: { id } })')
    expect(failures).toContain(
      `${relative}: application-scoped repositories must expose or enforce an appId ownership boundary.`,
    )
  })

  it('allows application code to compose shared features', () => {
    expect(
      getLayerViolations(
        'apps/api/src/apps/obo/plan-permits/plan-permit.service.js',
        "import { createRecord } from '../../../features/cases/cases.service.js'",
      ),
    ).not.toContain(expect.stringContaining('must not import'))
  })
})
