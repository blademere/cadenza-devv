import { describe, expect, it } from 'vitest'
const { getAuthorizationContextResponse } = require('../../../../src/platform/authorization/authorization-context.service')

vi.mock('../../../../src/platform/authorization/authorization-context.repository.js', () => ({
  getUserAuthorizationContext: vi.fn(),
  listActiveModules: vi.fn(),
}))

const repository = require('../../../../src/platform/authorization/authorization-context.repository.js')

describe('authorization context service', () => {
  it('returns only authorization state and leaves capability composition to consumers', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      role: { id: 3, name: 'receiving_officer' },
      permissions: [
        { resource: 'obo_plan_permits', action: 'read', moduleName: 'Plan Permits' },
        { resource: 'obo_professionals', action: 'review', moduleName: 'Professionals' },
      ],
    })
    repository.listActiveModules.mockResolvedValue([
      { key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true },
      { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true },
    ])

    const result = await getAuthorizationContextResponse(42)

    expect(result).toEqual({
      role: { id: 3, name: 'receiving_officer' },
      permissions: ['obo_plan_permits:read', 'obo_professionals:review'],
      modules: [
        { key: 'obo_plan_permits', name: 'Plan Permits', description: null, isActive: true },
        { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true },
      ],
    })
    expect(result).not.toHaveProperty('navigation')
  })
})
