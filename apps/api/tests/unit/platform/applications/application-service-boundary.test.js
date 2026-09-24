import { describe, expect, it, vi, beforeEach } from 'vitest'

const repository = {
  getAppByKey: vi.fn(),
  getAppById: vi.fn(),
  getMembership: vi.fn(),
  listActiveApps: vi.fn(),
  listUserApps: vi.fn(),
  createMembership: vi.fn(),
  disableMembership: vi.fn(),
  getMembershipById: vi.fn(),
  assignMembershipRole: vi.fn(),
  removeMembershipRole: vi.fn(),
  listMembershipRoles: vi.fn(),
}

vi.mock('../../../../src/platform/applications/application.repository.js', () => repository)

const service = await import('../../../../src/platform/applications/application.service.js')

describe('application service security boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an unknown application key', async () => {
    repository.getAppByKey.mockResolvedValue(null)

    await expect(service.requireAppByKey('missing')).rejects.toThrow("Application 'missing' was not found.")
  })

  it('rejects an unknown application id before creating membership', async () => {
    repository.getAppById.mockResolvedValue(null)

    await expect(service.addMembership({ userId: 42, appId: 'missing' }))
      .rejects.toThrow("Application 'missing' was not found.")
    expect(repository.createMembership).not.toHaveBeenCalled()
  })

  it('requires an active application when establishing membership', async () => {
    repository.getMembership.mockResolvedValue({
      id: 'membership-1',
      isActive: true,
      app: { id: 'app-obo', key: 'obo', isActive: false },
    })

    await expect(service.requireActiveMembership({ userId: 42, appId: 'app-obo' }))
      .rejects.toThrow('User does not have an active membership for this application.')
  })

  it('requires an active membership even when the application is active', async () => {
    repository.getMembership.mockResolvedValue({
      id: 'membership-1',
      isActive: false,
      app: { id: 'app-obo', key: 'obo', isActive: true },
    })

    await expect(service.requireActiveMembership({ userId: 42, appId: 'app-obo' }))
      .rejects.toThrow('User does not have an active membership for this application.')
  })

  it('returns no membership when membership or application is inactive', async () => {
    repository.getMembership.mockResolvedValue({
      id: 'membership-1',
      isActive: true,
      app: { id: 'app-obo', key: 'obo', isActive: false },
    })

    await expect(service.getUserMembership({ userId: 42, appId: 'app-obo' })).resolves.toBeNull()
  })

  it('delegates membership creation only after application existence is verified', async () => {
    repository.getAppById.mockResolvedValue({ id: 'app-obo', key: 'obo', isActive: true })
    repository.createMembership.mockResolvedValue({
      id: 'membership-1',
      app: { id: 'app-obo', key: 'obo', name: 'One-Stop Business Office' },
      roles: [],
    })

    const result = await service.addMembership({ userId: 42, appId: 'app-obo' })

    expect(repository.createMembership).toHaveBeenCalledWith({ userId: 42, appId: 'app-obo' })
    expect(result).toMatchObject({ id: 'membership-1' })
  })

  it('rejects assigning a role through a membership from another application', async () => {
    repository.getMembershipById.mockResolvedValue({
      id: 'membership-admin',
      appId: 'app-admin',
      isActive: true,
    })

    await expect(service.addMembershipRole({
      membershipId: 'membership-admin',
      roleId: 11,
      appId: 'app-obo',
    })).rejects.toThrow('Membership does not belong to the current application.')

    expect(repository.assignMembershipRole).not.toHaveBeenCalled()
  })

  it('rejects removing a role through a membership from another application', async () => {
    repository.getMembershipById.mockResolvedValue({
      id: 'membership-admin',
      appId: 'app-admin',
      isActive: true,
    })

    await expect(service.removeMembershipRoleAssignment({
      membershipId: 'membership-admin',
      roleId: 11,
      appId: 'app-obo',
    })).rejects.toThrow('Membership does not belong to the current application.')

    expect(repository.removeMembershipRole).not.toHaveBeenCalled()
  })
})
