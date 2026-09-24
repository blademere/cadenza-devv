import { describe, expect, it } from 'vitest'
import { navigation, normalizeNavigation } from '../../../src/config/navigation.js'
import { permissions } from '../../../src/config/permissions.js'

const visibleKeys = (permissionValues) =>
  normalizeNavigation(navigation, permissionValues).flatMap((section) => section.items.map((item) => item.key))

describe('OBO navigation authorization', () => {
  it('keeps dashboard available without operational permissions', () => {
    expect(visibleKeys([])).toEqual(['dashboard'])
  })

  it('shows applications only with application read access', () => {
    expect(visibleKeys([permissions.applications.read])).toContain('applications')
    expect(visibleKeys([permissions.applications.read])).not.toContain('permit-types')
  })

  it('shows permit types only with permit type read access', () => {
    expect(visibleKeys([permissions.permitTypes.read])).toContain('permit-types')
    expect(visibleKeys([permissions.permitTypes.read])).not.toContain('applications')
  })

  it('shows receiving only with receiving permission', () => {
    expect(visibleKeys([permissions.applications.receive])).toContain('receiving')
    expect(visibleKeys([permissions.applications.receive])).not.toContain('applications')
  })

  it('shows appointments only with appointment management permission', () => {
    expect(visibleKeys([permissions.appointments.manage])).toContain('appointments')
    expect(visibleKeys([])).not.toContain('appointments')
  })

  it('separates professional directory and verification permissions', () => {
    expect(visibleKeys([permissions.professionals.read])).toContain('professionals')
    expect(visibleKeys([permissions.professionals.read])).not.toContain('professional-verification')

    expect(visibleKeys([permissions.professionals.review])).toContain('professional-verification')
    expect(visibleKeys([permissions.professionals.review])).not.toContain('professionals')
  })

  it('keeps users and roles independently permissioned', () => {
    expect(visibleKeys([permissions.users.manage])).toContain('users')
    expect(visibleKeys([permissions.users.manage])).not.toContain('roles')

    expect(visibleKeys([permissions.authorization.manage])).toContain('roles')
    expect(visibleKeys([permissions.authorization.manage])).not.toContain('users')
  })

  it('requires every permission when an item declares multiple permissions', () => {
    const sections = [
      {
        key: 'test',
        name: 'Test',
        items: [
          {
            key: 'combined',
            name: 'Combined',
            route: '/combined',
            requiredPermissions: ['one', 'two'],
          },
        ],
      },
    ]

    expect(normalizeNavigation(sections, ['one'])).toEqual([])
    expect(normalizeNavigation(sections, ['one', 'two'])[0].items[0].key).toBe('combined')
  })

  it('does not mutate the source navigation configuration', () => {
    const original = JSON.parse(JSON.stringify(navigation, (key, value) =>
      key === 'icon' ? undefined : value,
    ))

    normalizeNavigation(navigation, [permissions.users.manage])

    expect(JSON.parse(JSON.stringify(navigation, (key, value) =>
      key === 'icon' ? undefined : value,
    ))).toEqual(original)
  })
})
