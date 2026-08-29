import { beforeEach, describe, expect, it, vi } from 'vitest'

const bcrypt = require('bcrypt')
const users = require('../../../src/features/users/user.repository.js')
const auth = require('../../../src/features/auth/auth.repository.js')
const accessControl = require('../../../src/platform/authorization/access-control.repository.js')
const mapper = require('../../../src/features/users/user.mapper.js')

vi.spyOn(bcrypt, 'hash')
vi.spyOn(users, 'findAllUsers')
vi.spyOn(users, 'createUser')
vi.spyOn(auth, 'findUserByEmail')
vi.spyOn(accessControl, 'findRoleById')
vi.spyOn(accessControl, 'getUserAuthorizationContext')
vi.spyOn(mapper, 'toUserResponse')

const { registerUser } = await import('../../../src/features/users/user.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  bcrypt.hash.mockResolvedValue('hashed-password')
  auth.findUserByEmail.mockResolvedValue(null)
  users.createUser.mockResolvedValue({ id: 100, email: 'new@example.com', roleId: 2 })
  mapper.toUserResponse.mockImplementation((user) => user)
})

describe('user role assignment', () => {
  it('rejects assignment of a role containing permissions the requester lacks', async () => {
    accessControl.getUserAuthorizationContext.mockResolvedValue({
      role: 'operator',
      permissions: [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
      ],
    })
    accessControl.findRoleById.mockResolvedValue({
      id: 2,
      name: 'administrator',
      permissions: [
        { permission: { action: 'approve', module: { key: 'applications' } } },
      ],
    })

    await expect(
      registerUser({
        requesterId: 7,
        email: 'new@example.com',
        roleId: 2,
        password: 'password123',
      }),
    ).rejects.toThrow('You cannot assign a role containing permissions that you do not have.')

    expect(users.createUser).not.toHaveBeenCalled()
    expect(bcrypt.hash).not.toHaveBeenCalled()
  })

  it('allows assignment when the target role permissions are a subset of requester permissions', async () => {
    accessControl.getUserAuthorizationContext.mockResolvedValue({
      role: 'administrator',
      permissions: [
        { resource: 'users', action: 'create' },
        { resource: 'users', action: 'read' },
        { resource: 'applications', action: 'approve' },
      ],
    })
    accessControl.findRoleById.mockResolvedValue({
      id: 2,
      name: 'operator',
      permissions: [
        { permission: { action: 'create', module: { key: 'users' } } },
        { permission: { action: 'read', module: { key: 'users' } } },
      ],
    })

    await expect(
      registerUser({
        requesterId: 7,
        email: 'new@example.com',
        roleId: 2,
        password: 'password123',
      }),
    ).resolves.toEqual({ id: 100, email: 'new@example.com', roleId: 2 })

    expect(users.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      roleId: 2,
      passwordHash: 'hashed-password',
    })
  })
})
