import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../../src/common/errors/appError.js'

const mocks = vi.hoisted(() => ({
  findUserWithRole: vi.fn(),
  getByUserId: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  toUserResponse: vi.fn((user) => ({ id: user.id, email: user.email, role: user.role })),
}))

vi.mock('../../../../src/features/users/user.repository.js', () => ({
  findAllUsers: vi.fn(),
  createUser: vi.fn(),
  findUserWithRole: mocks.findUserWithRole,
  findRoleForAssignment: vi.fn(),
  updateUserRole: vi.fn(),
}))
vi.mock('../../../../src/features/users/user.mapper.js', () => ({
  toUserResponse: mocks.toUserResponse,
}))
vi.mock('../../../../src/features/auth/auth.repository.js', () => ({
  findUserByEmail: vi.fn(),
}))
vi.mock('../../../../src/features/people/people.service.js', () => ({
  getByUserId: mocks.getByUserId,
  create: mocks.create,
  update: mocks.update,
}))
vi.mock('../../../../src/platform/authorization/access-control.repository.js', () => ({
  findRoleById: vi.fn(),
  getUserAuthorizationContext: vi.fn(),
}))
vi.mock('../../../../src/platform/authorization/access-control.service.js', () => ({
  clearUserPermissionCache: vi.fn(),
}))

const service = await import('../../../../src/features/users/user.service.js')

afterEach(() => vi.clearAllMocks())

describe('authenticated person profile service', () => {
  it('returns the authenticated user and platform person profile', async () => {
    const user = { id: 7, email: 'receiving@example.test', role: { id: 4, name: 'receiving_officer' } }
    const person = { id: 'person-7', userId: 7, firstName: 'Receiving', lastName: 'Officer' }
    mocks.findUserWithRole.mockResolvedValue(user)
    mocks.getByUserId.mockResolvedValue(person)

    await expect(service.getMyProfile(7)).resolves.toEqual({
      user: { id: 7, email: 'receiving@example.test', role: user.role },
      person,
    })
    expect(mocks.getByUserId).toHaveBeenCalledWith(7)
  })

  it('creates a platform person profile for the authenticated user when missing', async () => {
    const user = { id: 7, email: 'receiving@example.test', role: { id: 4, name: 'receiving_officer' } }
    const person = { id: 'person-7', userId: 7, firstName: 'Maria', lastName: 'Officer' }
    mocks.findUserWithRole.mockResolvedValue(user)
    mocks.getByUserId.mockRejectedValue(new NotFoundError('Person not found.'))
    mocks.create.mockResolvedValue(person)

    await expect(service.createMyProfile(7, {
      firstName: 'Maria',
      lastName: 'Officer',
      phone: '+63123456789',
    })).resolves.toEqual({
      user: { id: 7, email: 'receiving@example.test', role: user.role },
      person,
    })
    expect(mocks.create).toHaveBeenCalledWith({
      firstName: 'Maria',
      lastName: 'Officer',
      phone: '+63123456789',
      userId: 7,
    })
  })

  it('rejects creation when the authenticated user already has a person profile', async () => {
    const user = { id: 7, email: 'receiving@example.test', role: { id: 4, name: 'receiving_officer' } }
    const person = { id: 'person-7', userId: 7, firstName: 'Receiving', lastName: 'Officer' }
    mocks.findUserWithRole.mockResolvedValue(user)
    mocks.getByUserId.mockResolvedValue(person)

    await expect(service.createMyProfile(7, {
      firstName: 'Maria',
      lastName: 'Officer',
    })).rejects.toThrow('Profile already exists.')
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('updates only the authenticated user person profile', async () => {
    const user = { id: 7, email: 'receiving@example.test', role: { id: 4, name: 'receiving_officer' } }
    const person = { id: 'person-7', userId: 7, firstName: 'Receiving', lastName: 'Officer' }
    const updatedPerson = { ...person, firstName: 'Maria', phone: '+63123456789' }
    mocks.findUserWithRole.mockResolvedValue(user)
    mocks.getByUserId.mockResolvedValue(person)
    mocks.update.mockResolvedValue(updatedPerson)

    await expect(service.updateMyProfile(7, { firstName: 'Maria', phone: '+63123456789' })).resolves.toEqual({
      user: { id: 7, email: 'receiving@example.test', role: user.role },
      person: updatedPerson,
    })
    expect(mocks.update).toHaveBeenCalledWith('person-7', { firstName: 'Maria', phone: '+63123456789' })
  })
})
