import { describe, expect, it } from 'vitest'
import { authorizationCatalog, rolePermissions } from '../../../../scripts/seed/authorization.js'

describe('OBO authorization seed', () => {
  it('defines appointment permissions in the shared authorization catalog', () => {
    expect(authorizationCatalog.appointments).toEqual([
      'read',
      'create',
      'cancel',
      'check_in',
      'manage',
    ])
  })

  it('grants appointments:read to every OBO role that reads appointment data', () => {
    expect(rolePermissions.client).toContain('appointments:read')
    expect(rolePermissions.professional).toContain('appointments:read')
    expect(rolePermissions.receiving_officer).toContain('appointments:read')
  })

  it('grants receiving_officer the permissions required by appointment management', () => {
    expect(rolePermissions.receiving_officer).toEqual(
      expect.arrayContaining([
        'appointments:read',
        'appointments:check_in',
        'appointments:manage',
      ]),
    )
  })
})
