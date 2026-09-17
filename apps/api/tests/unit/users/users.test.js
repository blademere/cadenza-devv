import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/users/user.repository.js')
vi.mock('../../../src/features/users/user.mapper.js')

const users = await import('../../../src/features/users/user.repository.js')
const mapper = await import('../../../src/features/users/user.mapper.js')
const { createUser } = await import('../../../src/features/users/user.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  users.findUserByEmail.mockResolvedValue(null)
  users.createUser.mockResolvedValue({ id: 100, email: 'new@example.com' })
  mapper.toUserResponse.mockImplementation((user) => user)
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
