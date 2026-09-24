import { describe, expect, it } from 'vitest'
import {
  getApplicationSecurityViolations,
  getLayerViolations,
} from '../../../../scripts/architecture-rules.cjs'

describe('application security architecture boundaries', () => {
  it('keeps platform application security domain-neutral', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/platform/applications/application.service.js',
        "import oboService from '../../apps/obo/permit.service.js'"
      )
    ).toContain(
      'apps/api/src/platform/applications/application.service.js: application security must remain domain-neutral and must not depend on apps, modules, or features.'
    )
  })

  it('allows platform application security to depend on common code', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/platform/applications/application.service.js',
        "import { ForbiddenError } from '../../common/errors/appError.js'"
      )
    ).toEqual([])
  })

  it('prevents shared features from reaching the authorization repository', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/features/users/user.service.js',
        "import repository from '../../platform/authorization/access-control.repository.js'"
      )
    ).toContain(
      'apps/api/src/features/users/user.service.js: features must not access the platform authorization repository directly; use platform authorization enforcement/context APIs.'
    )
  })

  it('allows features to use platform authorization enforcement APIs', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/features/users/user.routes.js',
        "import authorize from '../../platform/authorization/authorize.js'"
      )
    ).toEqual([])
  })

  it('prevents OBO from importing application-security repositories or services directly', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/apps/obo/professionals/professional.service.js',
        "import { getMembership } from '../../../platform/applications/application.repository.js'"
      )
    ).toContain(
      'apps/api/src/apps/obo/professionals/professional.service.js: OBO must consume application security through platform context/middleware, not import application-security repositories or services directly.'
    )
  })

  it('allows OBO to consume platform authorization middleware', () => {
    expect(
      getApplicationSecurityViolations(
        'apps/api/src/apps/obo/professionals/professional.routes.js',
        "import authorize from '../../../platform/authorization/authorize.js'"
      )
    ).toEqual([])
  })

  it('retains the existing platform dependency direction rule', () => {
    expect(
      getLayerViolations(
        'apps/api/src/platform/applications/application.service.js',
        "import obo from '../../modules/obo/index.js'"
      )
    ).toContain(
      'apps/api/src/platform/applications/application.service.js: platform code must not import features or modules.'
    )
  })
})
