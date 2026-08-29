import { beforeEach, describe, expect, it, vi } from 'vitest'

const bcrypt = require('bcrypt')
const authRepository = require('../../../src/features/auth/auth.repository.js')

vi.spyOn(bcrypt, 'hash')
vi.spyOn(authRepository, 'findUserByEmail')
vi.spyOn(authRepository, 'findRoleByName')
vi.spyOn(authRepository, 'createUser')

const { registerUser } = await import('../../../src/features/auth/user-registration.js')

beforeEach(() => {
  vi.clearAllMocks()
  bcrypt.hash.mockResolvedValue('hashed-password')
  authRepository.findUserByEmail.mockResolvedValue(null)
  authRepository.findRoleByName.mockResolvedValue({ id: 7, name: 'client', description: 'Client role' })
  authRepository.createUser.mockResolvedValue({
    id: 100,
    email: 'user@example.com',
    role: { id: 7, name: 'client', description: 'Client role' },
  })
})

describe('user registration', () => {
  it('creates a user with the default client role', async () => {
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).resolves.toEqual({
      id: 100,
      email: 'user@example.com',
      role: { id: 7, name: 'client', description: 'Client role' },
    })

    expect(authRepository.findUserByEmail).toHaveBeenCalledWith('user@example.com')
    expect(authRepository.findRoleByName).toHaveBeenCalledWith('client')
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
    expect(authRepository.createUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      roleId: 7,
      passwordHash: 'hashed-password',
    })
  })

  it('rejects an existing email before hashing the password', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com' })

    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow(
      'An account with this email already exists.',
    )

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })

  it('fails closed when the default role is missing', async () => {
    authRepository.findRoleByName.mockResolvedValue(null)

    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow(
      "The default 'client' role is not configured.",
    )

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })

  it('converts a Prisma unique constraint race into a conflict error', async () => {
    authRepository.createUser.mockRejectedValue({ code: 'P2002' })

    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow(
      'An account with this email already exists.',
    )
  })
})
