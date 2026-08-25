import { beforeEach, describe, expect, it, vi } from 'vitest'

const bcrypt = require('bcrypt')
const authRepository = require('../../../src/features/auth/auth.repository.js')

vi.spyOn(bcrypt, 'hash')
vi.spyOn(authRepository, 'findUserByEmail')
vi.spyOn(authRepository, 'findRoleByName')
vi.spyOn(authRepository, 'createUser')

const { registerClient } = await import('../../../src/features/auth/client-registration.js')

beforeEach(() => {
  vi.clearAllMocks()
  bcrypt.hash.mockResolvedValue('hashed-password')
  authRepository.findUserByEmail.mockResolvedValue(null)
  authRepository.findRoleByName.mockResolvedValue({ id: 7, name: 'client', description: 'Client role' })
  authRepository.createUser.mockResolvedValue({
    id: 100,
    email: 'client@example.com',
    role: { id: 7, name: 'client', description: 'Client role' },
  })
})

describe('client account registration', () => {
  it('creates a client account with the canonical client role', async () => {
    await expect(registerClient({ email: 'client@example.com', password: 'password123' })).resolves.toEqual({
      id: 100,
      email: 'client@example.com',
      role: { id: 7, name: 'client', description: 'Client role' },
    })

    expect(authRepository.findRoleByName).toHaveBeenCalledWith('client')
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
    expect(authRepository.createUser).toHaveBeenCalledWith({
      email: 'client@example.com',
      roleId: 7,
      passwordHash: 'hashed-password',
    })
  })

  it('rejects an existing email before hashing the password', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ id: 42, email: 'client@example.com' })

    await expect(registerClient({ email: 'client@example.com', password: 'password123' })).rejects.toThrow(
      'An account with this email already exists.',
    )

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })

  it('fails closed when the client role is not configured', async () => {
    authRepository.findRoleByName.mockResolvedValue(null)

    await expect(registerClient({ email: 'client@example.com', password: 'password123' })).rejects.toThrow(
      "The 'client' role is not configured.",
    )

    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })
})
