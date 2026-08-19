import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const repository = require('../../../src/features/participants/participants.repository')
const spies = {
  addParticipant: vi.spyOn(repository, 'addParticipant'),
  listParticipants: vi.spyOn(repository, 'listParticipants'),
  findParticipant: vi.spyOn(repository, 'findParticipant'),
  findCase: vi.spyOn(repository, 'findCase'),
  findPerson: vi.spyOn(repository, 'findPerson'),
  removeParticipant: vi.spyOn(repository, 'removeParticipant'),
}

const { add, list, remove } = await import('../../../src/features/participants/participants.service.js')

afterEach(() => vi.clearAllMocks())

describe('participants service', () => {
  it('adds a normalized participant role', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue(null)
    spies.addParticipant.mockImplementation(async (data) => ({ id: 'participant-1', ...data }))

    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: ' OWNER ' }))
      .resolves.toMatchObject({ roleKey: 'OWNER' })
  })

  it('rejects duplicate participants', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue({ id: 'participant-1' })

    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: 'OWNER' }))
      .rejects.toThrow('Participant is already assigned to this case role.')
  })

  it('rejects missing case or person', async () => {
    spies.findCase.mockResolvedValue(null)
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    await expect(add({ caseId: 'missing', personId: 'person-1', roleKey: 'OWNER' }))
      .rejects.toThrow('Case not found.')
  })
})
