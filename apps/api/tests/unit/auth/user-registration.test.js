import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bcrypt')
vi.mock('../../../src/features/auth/auth.repository.js')

const bcrypt = await import('bcrypt')
const authRepository = await import('../../../src/features/auth/auth.repository.js')
const { registerUser } = await import('../../../src/features/auth/registration.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  bcrypt.default.hash.mockResolvedValue('hashed-password')
  authRepository.findUserByEmail.mockResolvedValue(null)
  authRepository.findRoleByName.mockResolvedValue({ id: 7, name: 'client', description: 'Client role' })
  authRepository.createUser.mockResolvedValue({ id: 100, email: 'user@example.com', role: { id: 7, name: 'client', description: 'Client role' } })
})

describe('user registration', () => {
  it('creates a user with the default client role', async () => {
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).resolves.toEqual({ id: 100, email: 'user@example.com', role: { id: 7, name: 'client', description: 'Client role' } })
    expect(authRepository.findUserByEmail).toHaveBeenCalledWith('user@example.com')
    expect(authRepository.findRoleByName).toHaveBeenCalledWith('client')
    expect(bcrypt.default.hash).toHaveBeenCalledWith('password123', 12)
    expect(authRepository.createUser).toHaveBeenCalledWith({ email: 'user@example.com', roleId: 7, passwordHash: 'hashed-password' })
  })
  it('rejects an existing email before hashing the password', async () => {
    authRepository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com' })
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('An account with this email already exists.')
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })
  it('fails closed when the default role is missing', async () => {
    authRepository.findRoleByName.mockResolvedValue(null)
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow("The default 'client' role is not configured.")
    expect(bcrypt.default.hash).not.toHaveBeenCalled()
    expect(authRepository.createUser).not.toHaveBeenCalled()
  })
  it('converts a Prisma unique constraint race into a conflict error', async () => {
    authRepository.createUser.mockRejectedValue({ code: 'P2002' })
    await expect(registerUser({ email: 'user@example.com', password: 'password123' })).rejects.toThrow('An account with this email already exists.')
  })
})
