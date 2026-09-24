import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/participants/participants.repository.js')

const repository = await import('../../../src/features/participants/participants.repository.js')
const { default: participantsService } = await import('../../../src/features/participants/participants.service.js')
const { add, list, remove } = participantsService
const spies = {
  addParticipant: repository.addParticipant,
  findParticipant: repository.findParticipant,
  findCase: repository.findCase,
  findPerson: repository.findPerson,
  listParticipants: repository.listParticipants,
  removeParticipant: repository.removeParticipant,
}

afterEach(() => vi.clearAllMocks())

describe('participants capability', () => {
  it('requires application context', async () => {
    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: 'OWNER' })).rejects.toThrow('Application id is required for application-scoped data access.')
  })

  it('adds a normalized participant role within the application', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue(null)
    spies.addParticipant.mockImplementation(async (data) => ({ id: 'participant-1', ...data }))
    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: ' OWNER ', appId: 'obo-app' })).resolves.toMatchObject({ roleKey: 'OWNER' })
    expect(spies.findCase).toHaveBeenCalledWith('case-1', 'obo-app', undefined)
    expect(spies.findParticipant).toHaveBeenCalledWith('case-1', 'person-1', 'OWNER', 'obo-app', undefined)
    expect(spies.addParticipant).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', personId: 'person-1', roleKey: 'OWNER' }), 'obo-app', undefined)
  })

  it('rejects duplicate participants in the scoped case', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    spies.findParticipant.mockResolvedValue({ id: 'participant-1' })
    await expect(add({ caseId: 'case-1', personId: 'person-1', roleKey: 'OWNER', appId: 'obo-app' })).rejects.toThrow('Participant is already assigned to this case role.')
  })

  it('rejects a case outside the current application', async () => {
    spies.findCase.mockResolvedValue(null)
    spies.findPerson.mockResolvedValue({ id: 'person-1' })
    await expect(add({ caseId: 'admin-case', personId: 'person-1', roleKey: 'OWNER', appId: 'obo-app' })).rejects.toThrow('Case not found.')
    expect(spies.findCase).toHaveBeenCalledWith('admin-case', 'obo-app', undefined)
  })

  it('lists only participants through an application-owned case', async () => {
    spies.findCase.mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    spies.listParticipants.mockResolvedValue([{ id: 'participant-1' }])
    await expect(list({ caseId: 'case-1', appId: 'obo-app' })).resolves.toEqual([{ id: 'participant-1' }])
    expect(spies.listParticipants).toHaveBeenCalledWith('case-1', 'obo-app', undefined)
  })

  it('rejects removal outside the current application', async () => {
    spies.removeParticipant.mockResolvedValue(null)
    await expect(remove({ id: 'participant-1', appId: 'obo-app' })).rejects.toThrow('Participant not found.')
    expect(spies.removeParticipant).toHaveBeenCalledWith('participant-1', 'obo-app', undefined)
  })
})
