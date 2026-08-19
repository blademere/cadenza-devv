import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/people/people.repository', () => ({
  createPerson: vi.fn(async (data) => ({ id: 'person-1', ...data })),
  findPersonById: vi.fn(async (id) =>
    id === 'person-1' ? { id: 'person-1', firstName: 'A', lastName: 'B' } : null,
  ),
  listPeople: vi.fn(async () => []),
  countPeople: vi.fn(async () => 0),
  updatePerson: vi.fn(async (id, data) => ({ id, ...data })),
}))

const { create, update } = await import('../../../src/features/people/people.service.js')

describe('people service', () => {
  it('requires a first and last name', async () => {
    await expect(create({ firstName: '', lastName: 'Doe' })).rejects.toThrow(
      'firstName and lastName are required.',
    )
  })

  it('normalizes names on create and update', async () => {
    await expect(create({ firstName: ' Jane ', lastName: ' Doe ' })).resolves.toMatchObject({
      firstName: 'Jane',
      lastName: 'Doe',
    })

    await expect(update('person-1', { firstName: ' Jane ' })).resolves.toMatchObject({
      id: 'person-1',
      firstName: 'Jane',
    })
  })
})
