import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
  },
}))
vi.mock('../../../../src/features/users/user.service.js')
vi.mock('../../../../src/platform/applications/application.service.js')

const usersService = await import('../../../../src/features/users/user.service.js')
const applicationsService = await import('../../../../src/platform/applications/application.service.js')
const { listUsers, createUser, assignUserRole } = await import('../../../../src/apps/obo/users/user.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  usersService.listUsers.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNextPage: false, hasPreviousPage: false },
  })
  usersService.createUser.mockResolvedValue({
    id: 100,
    email: 'new@example.com',
    roles: [],
  })
  applicationsService.addMembership.mockResolvedValue({
    id: 200,
    userId: 100,
    appId: 7,
    isActive: true,
  })
  applicationsService.requireActiveMembership.mockResolvedValue({
    id: 200,
    userId: 100,
    appId: 7,
    isActive: true,
  })
  applicationsService.addMembershipRole.mockResolvedValue({
    id: 300,
    membershipId: 200,
    roleId: 11,
  })
})

describe('OBO user application service', () => {
  it('delegates application-scoped listing to the shared user capability', async () => {
    const pagination = { page: 2, limit: 20, skip: 20, take: 20 }
    const filters = { email: 'obo@example.com' }
    const orderBy = { createdAt: 'desc' }

    await listUsers({ appId: 7, filters, pagination, orderBy })

    expect(usersService.listUsers).toHaveBeenCalledWith({
      appId: 7,
      filters,
      pagination,
      orderBy,
    })
  })

  it('creates the global user and then creates the OBO membership', async () => {
    await expect(createUser({
      appId: 7,
      email: 'new@example.com',
      password: 'plain-password',
    })).resolves.toEqual({
      user: {
        id: 100,
        email: 'new@example.com',
        roles: [],
      },
      membership: {
        id: 200,
        userId: 100,
        appId: 7,
        isActive: true,
      },
    })

    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })
    expect(applicationsService.addMembership).toHaveBeenCalledWith({
      userId: 100,
      appId: 7,
    })
  })

  it('assigns a role through the active OBO membership', async () => {
    await expect(assignUserRole({
      appId: 7,
      userId: 100,
      roleId: 11,
    })).resolves.toEqual({
      userId: 100,
      membershipId: 200,
      role: {
        id: 300,
        membershipId: 200,
        roleId: 11,
      },
    })

    expect(applicationsService.requireActiveMembership).toHaveBeenCalledWith({
      userId: 100,
      appId: 7,
    })
    expect(applicationsService.addMembershipRole).toHaveBeenCalledWith({
      membershipId: 200,
      roleId: 11,
      appId: 7,
    })
  })
})
