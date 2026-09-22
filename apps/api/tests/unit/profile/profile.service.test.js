import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/users/user.repository.js')
vi.mock('../../../src/features/users/user.mapper.js')
vi.mock('../../../src/features/people/people.service.js')

const userRepository = await import('../../../src/features/users/user.repository.js')
const userMapper = await import('../../../src/features/users/user.mapper.js')
const peopleService = await import('../../../src/features/people/people.service.js')
const { NotFoundError } = await import('../../../src/common/errors/appError.js')
const { getMyProfile, createMyProfile, updateMyProfile } = await import('../../../src/features/profile/profile.service.js')

const user = {
  id: 7,
  email: 'user@example.com',
  isActive: true,
}
const person = {
  id: 12,
  userId: 7,
  firstName: 'Maria',
  lastName: 'Santos',
}
const userResponse = {
  id: 7,
  email: 'user@example.com',
  isActive: true,
  roles: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  userRepository.findUser.mockResolvedValue(user)
  userMapper.toUserResponse.mockReturnValue(userResponse)
  peopleService.getByUserId.mockResolvedValue(person)
  peopleService.create.mockResolvedValue(person)
  peopleService.update.mockResolvedValue({ ...person, firstName: 'Ana' })
})

describe('profile service', () => {
  it('returns the authenticated user and profile without application membership concerns', async () => {
    await expect(getMyProfile(7)).resolves.toEqual({
      user: userResponse,
      person,
    })

    expect(userRepository.findUser).toHaveBeenCalledWith(7)
    expect(peopleService.getByUserId).toHaveBeenCalledWith(7)
    expect(userMapper.toUserResponse).toHaveBeenCalledWith({ ...user, roles: [] })
  })

  it('creates a profile for an existing user', async () => {
    const data = {
      firstName: 'Maria',
      lastName: 'Santos',
    }
    peopleService.getByUserId.mockRejectedValueOnce(new NotFoundError('Profile not found.'))

    await expect(createMyProfile(7, data)).resolves.toEqual({
      user: userResponse,
      person,
    })

    expect(peopleService.getByUserId).toHaveBeenCalledWith(7)
    expect(peopleService.create).toHaveBeenCalledWith({ ...data, userId: 7 })
  })

  it('updates the authenticated user profile through the people capability', async () => {
    const data = { firstName: 'Ana' }

    await expect(updateMyProfile(7, data)).resolves.toEqual({
      user: userResponse,
      person: { ...person, firstName: 'Ana' },
    })

    expect(peopleService.getByUserId).toHaveBeenCalledWith(7)
    expect(peopleService.update).toHaveBeenCalledWith(12, data)
  })
})
