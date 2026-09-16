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
  mapper.toUserResponse.mockImplementation((user) => user)
})

describe('user registration', () => {
  it('requires application context', async () => {
    await expect(registerUser({
      requesterId: 7,
      email: 'new@example.com',
      password: 'password123',
    })).rejects.toThrow('Application context is required to create users.')
    expect(accessControl.getAuthorizationContext).not.toHaveBeenCalled()
    expect(users.createUser).not.toHaveBeenCalled()
  })

  it('requires an authorized requester before creating a user', async () => {
    accessControl.getAuthorizationContext.mockResolvedValue(null)

    await expect(registerUser({
      requesterId: 7,
      appId: 'app-obo',
      email: 'new@example.com',
      password: 'password123',
    })).rejects.toThrow('Your account is not authorized to create users.')
    expect(accessControl.getAuthorizationContext).toHaveBeenCalledWith(7, 'app-obo')
    expect(users.createUser).not.toHaveBeenCalled()
    expect(applications.addMembership).not.toHaveBeenCalled()
  })

  it('creates the user and application membership without assigning a role', async () => {
    accessControl.getAuthorizationContext.mockResolvedValue({
      roles: [{ id: 1, name: 'administrator' }],
      permissions: [{ resource: 'users', action: 'create' }],
    })

    await expect(registerUser({
      requesterId: 7,
      appId: 'app-obo',
      email: 'new@example.com',
      password: 'password123',
    })).resolves.toEqual({
      id: 100,
      email: 'new@example.com',
      roles: [],
      membershipId: 'membership-1',
    })
    expect(users.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })
    expect(applications.addMembership).toHaveBeenCalledWith({
      userId: 100,
      appId: 'app-obo',
    })
    expect(applications.addMembershipRole).not.toHaveBeenCalled()
  })
})
