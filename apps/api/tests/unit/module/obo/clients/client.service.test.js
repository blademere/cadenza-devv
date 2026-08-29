import { beforeEach, describe, expect, it, vi } from 'vitest'

const peopleService = require('../../../../../src/features/people/people.service')
const repository = require('../../../../../src/modules/obo/clients/client.repository')

vi.spyOn(peopleService, 'create')
vi.spyOn(peopleService, 'getByUserId')
vi.spyOn(repository, 'findByUserId')

const { createMine, getMine } = await import('../../../../../src/modules/obo/clients/client.service.js')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('OBO client registration', () => {
  it('creates a person profile for the authenticated user', async () => {
    repository.findByUserId.mockResolvedValue(null)
    peopleService.create.mockResolvedValue({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })

    await expect(createMine({ userId: 42, firstName: ' Juan ', lastName: 'Cruz', phone: '09171234567' })).resolves.toEqual({
      id: 'person-1',
      userId: 42,
      firstName: 'Juan',
      lastName: 'Cruz',
    })

    expect(repository.findByUserId).toHaveBeenCalledWith(42)
    expect(peopleService.create).toHaveBeenCalledWith({
      userId: 42,
      firstName: ' Juan ',
      lastName: 'Cruz',
      phone: '09171234567',
    })
  })

  it('rejects duplicate client profiles before creating a person', async () => {
    repository.findByUserId.mockResolvedValue({ id: 'person-1', userId: 42 })

    await expect(createMine({ userId: 42, firstName: 'Juan', lastName: 'Cruz' })).rejects.toThrow(
      'An OBO client profile already exists for this account.',
    )

    expect(peopleService.create).not.toHaveBeenCalled()
  })

  it('maps a concurrent userId unique violation to conflict', async () => {
    repository.findByUserId.mockResolvedValue(null)
    peopleService.create.mockRejectedValue({ code: 'P2002', meta: { target: ['userId'] } })

    await expect(createMine({ userId: 42, firstName: 'Juan', lastName: 'Cruz' })).rejects.toThrow(
      'An OBO client profile already exists for this account.',
    )
  })

  it('retrieves the authenticated user client profile', async () => {
    peopleService.getByUserId.mockResolvedValue({ id: 'person-1', userId: 42, firstName: 'Juan', lastName: 'Cruz' })

    await expect(getMine({ userId: 42 })).resolves.toEqual({
      id: 'person-1',
      userId: 42,
      firstName: 'Juan',
      lastName: 'Cruz',
    })

    expect(peopleService.getByUserId).toHaveBeenCalledWith(42)
  })
})
