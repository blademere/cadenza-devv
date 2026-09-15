import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bcrypt')
vi.mock('../../../src/features/users/user.repository.js')
vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/platform/authorization/access-control.service.js')
vi.mock('../../../src/platform/applications/application.service.js')
vi.mock('../../../src/features/users/user.mapper.js')

const bcrypt = await import('bcrypt')
const users = await import('../../../src/features/users/user.repository.js')
const accessControl = await import('../../../src/platform/authorization/access-control.service.js')
const applications = await import('../../../src/platform/applications/application.service.js')
const mapper = await import('../../../src/features/users/user.mapper.js')
const { registerUser } = await import('../../../src/features/users/user.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  bcrypt.default.hash.mockResolvedValue('hashed-password')
  users.findUserByEmail.mockResolvedValue(null)
  users.createUser.mockResolvedValue({ id: 100, email: 'new@example.com' })
  applications.addMembership.mockResolvedValue({ id: 'membership-1' })
  applications.addMembershipRole.mockResolvedValue({ id: 'membership-role-1' })
  mapper.toUserResponse.mockImplementation((user) => user)
})

describe('user role assignment', () => {
  it('rejects assignment of a role containing permissions the requester lacks', async () => {
    accessControl.getAuthorizationContext.mockResolvedValue({
      roles: [{ id: 1, name: 'operator' }],
      permissions: [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
      ],
    })
    accessControl.getRoleById.mockResolvedValue({
      id: 2,
      name: 'administrator',
      permissions: [{ permission: { action: 'approve', module: { key: 'applications' } } }],
    })

    await expect(registerUser({
      requesterId: 7,
      appId: 'app-obo',
      email: 'new@example.com',
      roleId: 2,
      password: 'password123',
    })).rejects.toThrow('You cannot assign a role containing permissions that you do not have.')
    expect(users.createUser).not.toHaveBeenCalled()
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(applications.addMembership).not.toHaveBeenCalled()
  })

  it('allows assignment when the target role permissions are a subset of requester permissions', async () => {
    accessControl.getAuthorizationContext.mockResolvedValue({
      roles: [{ id: 1, name: 'administrator' }],
      permissions: [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'applications', action: 'approve' },
      ],
    })
    accessControl.getRoleById.mockResolvedValue({
      id: 2,
      name: 'operator',
      permissions: [
        { permission: { action: 'create', module: { key: 'users' } } },
        { permission: { action: 'read', module: { key: 'users' } } },
      ],
    })

    await expect(registerUser({
      requesterId: 7,
      appId: 'app-obo',
      email: 'new@example.com',
      roleId: 2,
      password: 'password123',
    })).resolves.toEqual({
      id: 100,
      email: 'new@example.com',
      roles: [{ id: 2, name: 'operator', permissions: [
        { permission: { action: 'create', module: { key: 'users' } } },
        { permission: { action: 'read', module: { key: 'users' } } },
      ] }],
    })
    expect(users.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })
    expect(applications.addMembership).toHaveBeenCalledWith({
      userId: 100,
      appId: 'app-obo',
    })
    expect(applications.addMembershipRole).toHaveBeenCalledWith({
      membershipId: 'membership-1',
      roleId: 2,
    })
  })
})
