import { describe, expect, it } from 'vitest'
const { buildAuthorizationContext } = require('../../../../src/platform/authorization/authorization-context.service')

describe('authorization context service', () => {
  const capabilities = [
    {
      key: 'applications',
      moduleKey: 'obo_plan_permits',
      name: 'Applications',
      route: '/applications',
      permission: 'obo_plan_permits:read',
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
          { resource: 'obo_plan_permits', action: 'read' },
          { resource: 'obo_professionals', action: 'review' },
        ],
      },
      modules: [
        { key: 'obo_plan_permits', name: 'Plan Permits', isActive: true },
        { key: 'obo_professionals', name: 'Professionals', isActive: true },
      ],
      capabilities,
    })

    expect(result.role).toEqual({ id: 3, name: 'receiving_officer' })
    expect(result.permissions).toEqual([
      'obo_plan_permits:read',
      'obo_professionals:review',
    ])
    expect(result.navigation.every((item) => item.visible)).toBe(true)
  })

  it('hides capabilities whose module is disabled even when the permission is assigned', () => {
    const result = buildAuthorizationContext({
      context: {
        role: { id: 3, name: 'receiving_officer' },
        permissions: [
          { resource: 'obo_plan_permits', action: 'read' },
          { resource: 'obo_professionals', action: 'review' },
        ],
      },
      modules: [
        { key: 'obo_plan_permits', name: 'Plan Permits', isActive: true },
        { key: 'obo_professionals', name: 'Professionals', isActive: false },
      ],
      capabilities,
    })

    expect(result.navigation.find((item) => item.key === 'applications').visible).toBe(true)
    expect(result.navigation.find((item) => item.key === 'verification').visible).toBe(false)
  })

  it('does not expose a capability without its required permission', () => {
    const result = buildAuthorizationContext({
      context: {
        role: { id: 1, name: 'client' },
        permissions: [{ resource: 'obo_plan_permits', action: 'read' }],
      },
      modules: [
        { key: 'obo_plan_permits', name: 'Plan Permits', isActive: true },
        { key: 'obo_professionals', name: 'Professionals', isActive: true },
      ],
      capabilities,
    })

    expect(result.navigation.find((item) => item.key === 'applications').visible).toBe(true)
    expect(result.navigation.find((item) => item.key === 'verification').visible).toBe(false)
  })
})
