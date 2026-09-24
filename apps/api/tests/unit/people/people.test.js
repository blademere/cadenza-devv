import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/people/people.repository.js')

const peopleRepository = await import('../../../src/features/people/people.repository.js')
const { default: peopleService } = await import('../../../src/features/people/people.service.js')
const { create, update } = peopleService

const repositorySpies = {
  createPerson: peopleRepository.createPerson,
  findPersonById: peopleRepository.findPersonById,
  listPeople: peopleRepository.listPeople,
  countPeople: peopleRepository.countPeople,
  updatePerson: peopleRepository.updatePerson,
}

afterEach(() => vi.clearAllMocks())

describe('people creation and validation', () => {
  it('requires a first and last name', async () => {
    await expect(create({ firstName: '', lastName: 'Doe' })).rejects.toThrow('firstName and lastName are required.')
  })
})

describe('people normalization', () => {
  it('normalizes names on create and update', async () => {
    repositorySpies.createPerson.mockResolvedValue({ id: 'person-1', firstName: 'Jane', lastName: 'Doe' })
    repositorySpies.findPersonById.mockResolvedValue({ id: 'person-1', firstName: 'Jane', lastName: 'Doe' })
    repositorySpies.updatePerson.mockImplementation(async (id, data) => ({ id, ...data }))

    await expect(create({ firstName: ' Jane ', lastName: ' Doe ' })).resolves.toMatchObject({ firstName: 'Jane', lastName: 'Doe' })
    await expect(update('person-1', { firstName: ' Jane ' })).resolves.toMatchObject({ id: 'person-1', firstName: 'Jane' })
    expect(repositorySpies.findPersonById).toHaveBeenCalledWith('person-1')
    expect(repositorySpies.updatePerson).toHaveBeenCalledWith('person-1', { firstName: 'Jane' })
  })
})

describe('people updates', () => {
  it('rejects updates for a missing person', async () => {
    repositorySpies.findPersonById.mockResolvedValue(null)

    await expect(update('missing-person', { firstName: 'Jane' })).rejects.toThrow('Person not found.')
    expect(repositorySpies.updatePerson).not.toHaveBeenCalled()
  })
})
