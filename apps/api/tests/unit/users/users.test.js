import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/users/user.repository.js')
vi.mock('../../../src/features/users/user.mapper.js')

const users = await import('../../../src/features/users/user.repository.js')
const mapper = await import('../../../src/features/users/user.mapper.js')
const { listUsers, createUser } = await import('../../../src/features/users/user.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  users.findAllUsers.mockResolvedValue({ users: [], total: 0 })
  users.findUserByEmail.mockResolvedValue(null)
  users.createUser.mockResolvedValue({ id: 100, email: 'new@example.com' })
  mapper.toUserResponse.mockImplementation((user) => user)
})

describe('user listing capability', () => {
  it('accepts an explicit application-scoped service contract', async () => {
    const pagination = { page: 2, limit: 20, skip: 20, take: 20 }
    const orderBy = { createdAt: 'desc' }
    const filters = { email: 'obo@example.com' }

    await expect(listUsers({
      appId: 7,
      filters,
      pagination,
      orderBy,
    })).resolves.toEqual({
      data: [],
      pagination: {
        page: 2,
        limit: 20,
        total: 0,
        pages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })

    expect(users.findAllUsers).toHaveBeenCalledWith({
      appId: 7,
      filters,
      pagination,
      orderBy,
      skip: 20,
      take: 20,
    })
  })

  it('maps roles from the requested application membership', async () => {
    users.findAllUsers.mockResolvedValue({
      users: [{
        id: 100,
        email: 'obo@example.com',
        appMemberships: [
          {
            appId: 7,
            roles: [{ role: { id: 11, name: 'receiving_officer', description: 'Receives applications' } }],
          },
        ],
      }],
      total: 1,
    })

    await expect(listUsers({
      appId: 7,
      filters: {},
      pagination: { page: 1, limit: 20, skip: 0, take: 20 },
      orderBy: { createdAt: 'desc' },
    })).resolves.toMatchObject({
      data: [{
        id: 100,
        email: 'obo@example.com',
        roles: [{ id: 11, name: 'receiving_officer', description: 'Receives applications' }],
      }],
      pagination: { total: 1, pages: 1 },
    })
  })
})

describe('user creation capability', () => {
  it('creates a global user identity from a prepared password hash', async () => {
    await expect(createUser({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })).resolves.toEqual({
      id: 100,
      email: 'new@example.com',
      roles: [],
    })

    expect(users.findUserByEmail).toHaveBeenCalledWith('new@example.com')
    expect(users.createUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })
    expect(mapper.toUserResponse).toHaveBeenCalledWith({
      id: 100,
      email: 'new@example.com',
      roles: [],
    })
  })

  it('rejects duplicate email addresses', async () => {
    users.findUserByEmail.mockResolvedValue({
      id: 99,
      email: 'new@example.com',
    })

    await expect(createUser({
      email: 'new@example.com',
      passwordHash: 'hashed-password',
    })).rejects.toThrow('A user with this email already exists.')

    expect(users.createUser).not.toHaveBeenCalled()
  })
})
