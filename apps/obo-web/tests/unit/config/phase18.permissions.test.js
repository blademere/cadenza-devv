import { describe, expect, it } from 'vitest'
import { navigation } from '../../../src/config/navigation'
import { permissions } from '../../../src/config/permissions'

describe('Phase 18 OBO permission/navigation contract', () => {
  it('does not expose an inspection permission before inspection functionality exists', () => {
    expect(permissions.applications.inspect).toBeUndefined()
    expect(Object.values(permissions.applications)).not.toContain('obo_applications:inspect')
  })

  it('protects Permit Types navigation with permit type read permission', () => {
    const permitTypes = navigation
      .flatMap((section) => section.items || [])
      .find((item) => item.key === 'permit-types')

    expect(permitTypes?.requiredPermissions).toEqual([permissions.permitTypes.read])
  })
})
