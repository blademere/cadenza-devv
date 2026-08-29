import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const peopleRepository = require('../../../src/features/people/people.repository')

const repositorySpies = {
  createPerson: vi.spyOn(peopleRepository, 'createPerson'),
  findPersonById: vi.spyOn(peopleRepository, 'findPersonById'),
  listPeople: vi.spyOn(peopleRepository, 'listPeople'),
  countPeople: vi.spyOn(peopleRepository, 'countPeople'),
  updatePerson: vi.spyOn(peopleRepository, 'updatePerson'),
}

const { create, update } = await import('../../../src/features/people/people.service.js')

afterEach(() => {
  vi.clearAllMocks()
})

describe('people service', () => {
  it('requires a first and last name', async () => {
    await expect(create({ firstName: '', lastName: 'Doe' })).rejects.toThrow(
      'firstName and lastName are required.',
    )
  })

  it('normalizes names on create and update', async () => {
    repositorySpies.createPerson.mockResolvedValue({
      id: 'person-1',
      firstName: 'Jane',
      lastName: 'Doe',
    })
    repositorySpies.findPersonById.mockResolvedValue({
      id: 'person-1',
      firstName: 'Jane',
      lastName: 'Doe',
    })
    repositorySpies.updatePerson.mockImplementation(async (id, data) => ({
      id,
      ...data,
    }))

    await expect(create({ firstName: ' Jane ', lastName: ' Doe ' })).resolves.toMatchObject({
      firstName: 'Jane',
      lastName: 'Doe',
    })

    await expect(update('person-1', { firstName: ' Jane ' })).resolves.toMatchObject({
      id: 'person-1',
      firstName: 'Jane',
    })

    expect(repositorySpies.findPersonById).toHaveBeenCalledWith('person-1')
    expect(repositorySpies.updatePerson).toHaveBeenCalledWith('person-1', {
      firstName: 'Jane',
    })
  })

  it('rejects updates for a missing person', async () => {
    repositorySpies.findPersonById.mockResolvedValue(null)

    await expect(
      update('missing-person', { firstName: 'Jane' }),
    ).rejects.toThrow('Person not found.')

    expect(repositorySpies.updatePerson).not.toHaveBeenCalled()
  })
})
