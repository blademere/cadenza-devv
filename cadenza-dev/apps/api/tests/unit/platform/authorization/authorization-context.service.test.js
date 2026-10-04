import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/platform/authorization/authorization.repository.js', () => ({
  getUserAuthorizationContext: vi.fn(),
  listActiveModules: vi.fn(),
}))

const repository = await import('../../../../src/platform/authorization/authorization.repository.js')
const { getAuthorizationContextResponse } = await import('../../../../src/platform/authorization/authorization.service.js')

describe('authorization service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns app, membership, roles and permissions for the selected app', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [
        { resource: 'obo_applications', action: 'read' },
        { resource: 'obo_professionals', action: 'review' },
      ],
    })
    repository.listActiveModules.mockResolvedValue([
      { key: 'obo_applications', name: 'Applications', description: null, isActive: true },
      { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true },
    ])

    const result = await getAuthorizationContextResponse({ userId: 42, appId: 'app-1' })

    expect(result).toEqual({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: ['obo_applications:read', 'obo_professionals:review'],
      modules: [
        { key: 'obo_applications', name: 'Applications', description: null, isActive: true },
        { key: 'obo_professionals', name: 'Professionals', description: null, isActive: true },
      ],
    })
  })

  it('returns an empty app security state when membership is absent', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue(null)
    repository.listActiveModules.mockResolvedValue([])

    await expect(getAuthorizationContextResponse({ userId: 42, appId: 'missing-app' })).resolves.toEqual({
      userId: 42,
      app: null,
      membership: null,
      roles: [],
      permissions: [],
      modules: [],
    })
  })
})
