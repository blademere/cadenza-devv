import { describe, expect, it, vi, beforeEach } from 'vitest'

const authorize = vi.fn()
const authorizeResource = vi.fn()
const management = {
  listModules: vi.fn(),
  getModule: vi.fn(),
  createModule: vi.fn(),
  addPermission: vi.fn(),
  setModuleActive: vi.fn(),
  listRoles: vi.fn(),
  createRole: vi.fn(),
  getRole: vi.fn(),
  replaceRolePermissions: vi.fn(),
  listMembershipRoles: vi.fn(),
  replaceMembershipRoles: vi.fn(),
}

vi.mock('../../../src/platform/authorization/authorize.js', () => ({ default: authorize }))
vi.mock('../../../src/platform/authorization/authorization-resource.middleware.js', () => ({ default: authorizeResource }))
vi.mock('../../../src/apps/obo/authorization/authorization-management.service.js', () => management)

const service = await import('../../../src/apps/obo/authorization/authorization.service.js')

describe('OBO authorization service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows only OBO authorization resources', () => {
    expect(service.authorizeOBO('obo_plan_permits', 'read')).toBeUndefined()
    expect(authorize).toHaveBeenCalledWith('obo_plan_permits', 'read')

    expect(() => service.authorizeOBO('admin_users', 'read')).toThrow(
      'Unsupported OBO authorization resource: admin_users'
    )
    expect(authorize).toHaveBeenCalledTimes(1)
  })

  it('scopes OBO resource authorization before delegating to Platform', () => {
    const policy = () => true
    service.authorizeOBOResource({
      resource: 'obo_professionals',
      action: 'review',
      loadResource: vi.fn(),
      getResourceId: vi.fn(),
      policy,
    })

    expect(authorizeResource).toHaveBeenCalledWith({
      resource: 'obo_professionals',
      action: 'review',
      loadResource: expect.any(Function),
      getResourceId: expect.any(Function),
      policy,
    })
  })

  it('rejects non-OBO resources before reaching Platform resource authorization', () => {
    expect(() => service.authorizeOBOResource({
      resource: 'admin_users',
      action: 'read',
      loadResource: vi.fn(),
      getResourceId: vi.fn(),
    })).toThrow('Unsupported OBO authorization resource: admin_users')

    expect(authorizeResource).not.toHaveBeenCalled()
  })

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
