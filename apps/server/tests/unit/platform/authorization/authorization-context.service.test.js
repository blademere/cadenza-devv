import { describe, expect, it } from 'vitest'
const { buildAuthorizationContext } = require('../../../../src/platform/authorization/authorization-context.service')

describe('authorization context service', () => {
  const capabilities = [
    {
      key: 'applications',
      moduleKey: 'applications',
      name: 'Applications',
      route: '/applications',
      permission: 'applications:read',
    },
    {
      key: 'verification',
      moduleKey: 'obo_professionals',
      name: 'Verification',
      route: '/professionals/verification',
      permission: 'obo_professionals:review',
    },
  ]

  it('exposes only effective permissions and marks visible capabilities correctly', () => {
    const result = buildAuthorizationContext({
      context: {
        role: { id: 3, name: 'receiving_officer' },
        permissions: [
          { resource: 'applications', action: 'read' },
          { resource: 'obo_professionals', action: 'review' },
        ],
      },
      modules: [
        { key: 'applications', name: 'Applications', isActive: true },
        { key: 'obo_professionals', name: 'Professionals', isActive: true },
      ],
      capabilities,
    })

    expect(result.role).toEqual({ id: 3, name: 'receiving_officer' })
    expect(result.permissions).toEqual([
      'applications:read',
      'obo_professionals:review',
    ])
    expect(result.navigation.every((item) => item.visible)).toBe(true)
  })

  it('hides capabilities whose module is disabled even when the permission is assigned', () => {
    const result = buildAuthorizationContext({
      context: {
        role: { id: 3, name: 'receiving_officer' },
        permissions: [
          { resource: 'applications', action: 'read' },
          { resource: 'obo_professionals', action: 'review' },
        ],
      },
      modules: [
        { key: 'applications', name: 'Applications', isActive: false },
        { key: 'obo_professionals', name: 'Professionals', isActive: true },
      ],
      capabilities,
    })

    expect(result.navigation.find((item) => item.key === 'applications').visible).toBe(false)
    expect(result.navigation.find((item) => item.key === 'verification').visible).toBe(true)
  })

  it('does not expose a capability without its required permission', () => {
    const result = buildAuthorizationContext({
      context: {
        role: { id: 1, name: 'client' },
        permissions: [{ resource: 'obo_professionals', action: 'review' }],
      },
      modules: [
        { key: 'applications', name: 'Applications', isActive: true },
        { key: 'obo_professionals', name: 'Professionals', isActive: true },
      ],
      capabilities,
    })

    expect(result.navigation.find((item) => item.key === 'applications').visible).toBe(false)
    expect(result.navigation.find((item) => item.key === 'verification').visible).toBe(true)
  })
})
