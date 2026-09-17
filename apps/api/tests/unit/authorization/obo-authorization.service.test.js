import { describe, expect, it, vi, beforeEach } from 'vitest'

const management = {
  listModules: vi.fn(),
  getModule: vi.fn(),
  createModule: vi.fn(),
  addPermission: vi.fn(),
  setModuleActive: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  getRole: vi.fn(),
  getMembership: vi.fn(),
  replaceRolePermissions: vi.fn(),
  listMembershipRoles: vi.fn(),
  replaceMembershipRoles: vi.fn(),
}

vi.mock('../../../src/apps/obo/authorization/authorization-management.service.js', () => management)

const service = await import('../../../src/apps/obo/authorization/authorization.service.js')

describe('OBO authorization service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delegates OBO management directly to the application-owned service', async () => {
    management.listModules.mockResolvedValue([])
    management.getModule.mockResolvedValue(null)
    management.createModule.mockResolvedValue({ id: 1 })
    management.addPermission.mockResolvedValue({ id: 2 })

    await service.listAuthorizationModules()
    await service.getAuthorizationModule(1)
    await service.createAuthorizationModule({ key: 'obo_clients', name: 'Clients', description: null })
    await service.addAuthorizationPermission({ moduleId: 1, action: 'read' })

    expect(management.listModules).toHaveBeenCalledWith()
    expect(management.getModule).toHaveBeenCalledWith(1)
    expect(management.createModule).toHaveBeenCalledWith({
      key: 'obo_clients',
      name: 'Clients',
      description: null,
    })
    expect(management.addPermission).toHaveBeenCalledWith({
      moduleId: 1,
      action: 'read',
    })
  })

  it('passes application and membership scope to OBO role management', async () => {
    management.createRole.mockResolvedValue({ id: 9 })
    management.replaceMembershipRoles.mockResolvedValue([])

    await service.createAuthorizationRole({
      appId: 'obo-app',
      membershipId: 'membership-1',
      name: 'receiving_officer',
      description: 'Receiving officer',
    })
    await service.replaceMembershipAuthorizationRoles({
      appId: 'obo-app',
      membershipId: 'membership-1',
      roleIds: [9],
    })

    expect(management.createRole).toHaveBeenCalledWith({
      appId: 'obo-app',
      membershipId: 'membership-1',
      name: 'receiving_officer',
      description: 'Receiving officer',
    })
    expect(management.replaceMembershipRoles).toHaveBeenCalledWith({
      appId: 'obo-app',
      membershipId: 'membership-1',
      roleIds: [9],
    })
  })
})
