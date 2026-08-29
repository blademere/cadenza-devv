import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const repository = require('../../../src/modules/obo/professionals/professional.repository')
const peopleService = require('../../../src/features/people/people.service')

const repositorySpies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'),
}
const peopleSpies = {
  getByUserId: vi.spyOn(peopleService, 'getByUserId'),
  create: vi.spyOn(peopleService, 'create'),
  update: vi.spyOn(peopleService, 'update'),
}

const { getProfile, updateProfile, applyForVerification } = await import('../../../src/modules/obo/professionals/professional.service.js')

afterEach(() => {
  vi.clearAllMocks()
})

describe('professional person profile workflow', () => {
  it('retrieves the authenticated user person profile through the shared people feature', async () => {
    peopleSpies.getByUserId.mockResolvedValue({ id: 'person-1', userId: 7 })

    await expect(getProfile({ userId: 7 })).resolves.toMatchObject({
      id: 'person-1',
      userId: 7,
    })
    expect(peopleSpies.getByUserId).toHaveBeenCalledWith(7)
  })

  it('creates the person profile before professional application when no profile exists', async () => {
    repositorySpies.findPersonByUserId.mockResolvedValue(null)
    peopleSpies.create.mockResolvedValue({ id: 'person-1', userId: 7 })

    await expect(updateProfile({
      userId: 7,
      firstName: 'Jane',
      lastName: 'Doe',
    })).resolves.toMatchObject({
      id: 'person-1',
      userId: 7,
    })

    expect(peopleSpies.create).toHaveBeenCalledWith({
      userId: 7,
      firstName: 'Jane',
      lastName: 'Doe',
    })
  })

  it('updates the existing person profile instead of creating a duplicate', async () => {
    repositorySpies.findPersonByUserId.mockResolvedValue({ id: 'person-1', userId: 7 })
    peopleSpies.update.mockResolvedValue({ id: 'person-1', userId: 7, firstName: 'Jane', lastName: 'Doe' })

    await expect(updateProfile({
      userId: 7,
      firstName: 'Jane',
      lastName: 'Doe',
    })).resolves.toMatchObject({
      id: 'person-1',
      firstName: 'Jane',
    })

    expect(peopleSpies.update).toHaveBeenCalledWith('person-1', {
      firstName: 'Jane',
      lastName: 'Doe',
    })
    expect(peopleSpies.create).not.toHaveBeenCalled()
  })

  it('blocks professional verification application without a person profile', async () => {
    repositorySpies.findPersonByUserId.mockResolvedValue(null)

    await expect(applyForVerification({
      userId: 7,
      registrationNumber: 'REG-1',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })).rejects.toThrow(
      'Complete your person profile before applying for professional verification.',
    )
  })
})
