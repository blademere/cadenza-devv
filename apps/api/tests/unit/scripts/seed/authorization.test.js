import { describe, expect, it } from 'vitest'
import { oboAuthorizationCatalog as authorizationCatalog, oboRolePermissions as rolePermissions } from '../../../../scripts/seed/apps/obo/authorization.js'

describe('OBO authorization seed', () => {
  it('defines OBO appointment permissions in the authorization catalog', () => {
    expect(authorizationCatalog.obo_appointments).toEqual([
      'read',
      'create',
      'cancel',
      'check_in',
      'manage',
    ])
  })

  it('grants obo_appointments:read to every OBO role that reads appointment data', () => {
    expect(rolePermissions.client).toContain('obo_appointments:read')
    expect(rolePermissions.professional).toContain('obo_appointments:read')
    expect(rolePermissions.receiving_officer).toContain('obo_appointments:read')
  })

  it('grants receiving_officer the permissions required by OBO appointment management', () => {
    expect(rolePermissions.receiving_officer).toEqual(
      expect.arrayContaining([
        'obo_appointments:read',
        'obo_appointments:check_in',
        'obo_appointments:manage',
      ]),
    )
  })
})
