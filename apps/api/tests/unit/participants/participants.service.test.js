import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/participants/participants.repository.js')

const repository = await import('../../../src/features/participants/participants.repository.js')
const { default: participantsService } = await import('../../../src/features/participants/participants.service.js')
const { add } = participantsService
const spies = { addParticipant: repository.addParticipant, findParticipant: repository.findParticipant, findCase: repository.findCase, findPerson: repository.findPerson }

afterEach(() => vi.clearAllMocks())

describe('participants service', () => {
  it('adds a normalized participant role', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue(null)
    spies.addParticipant.mockImplementation(async (data) => ({ id: 'participant-1', ...data }))
    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: ' OWNER ' })).resolves.toMatchObject({ roleKey: 'OWNER' })
  })

  it('rejects duplicate participants', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue({ id: 'participant-1' })
    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: 'OWNER' })).rejects.toThrow('Participant is already assigned to this case role.')
  })

  it('rejects missing case or person', async () => {
    spies.findCase.mockResolvedValue(null)
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    await expect(add({ caseId: 'missing', personId: 'person-1', roleKey: 'OWNER' })).rejects.toThrow('Case not found.')
  })
})
