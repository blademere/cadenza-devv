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

const service = await import('../../../src/apps/obo/authorization/authorization-management.service.js')

describe('OBO authorization management service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exposes the application-owned management API', () => {
    expect(service.listModules).toBeTypeOf('function')
    expect(service.getModule).toBeTypeOf('function')
    expect(service.createModule).toBeTypeOf('function')
    expect(service.addPermission).toBeTypeOf('function')
    expect(service.createRole).toBeTypeOf('function')
    expect(service.replaceMembershipRoles).toBeTypeOf('function')
  })
})
