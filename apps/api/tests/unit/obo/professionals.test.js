import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/obo/professionals/professional.repository.js')
vi.mock('../../../src/features/people/people.service.js')
vi.mock('../../../src/platform/event-bus/event-bus.js')

const repository = await import('../../../src/apps/obo/professionals/professional.repository.js')
const peopleService = await import('../../../src/features/people/people.service.js')
const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const professionalService = await import('../../../src/apps/obo/professionals/professional.service.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  repository.findPersonByUserId.mockResolvedValue({ id: 'person-1', userId: 'user-1' })
  repository.findByPersonId.mockResolvedValue(null)
  repository.findById.mockResolvedValue(null)
  repository.withTransaction.mockImplementation(async (callback) => callback({ name: 'transaction' }))
  repository.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', verifiedAt: new Date('2026-08-17T07:00:00.000Z') })
  repository.addDecision.mockResolvedValue({ id: 'decision-1' })
  repository.findPersonById.mockResolvedValue({ userId: 2, email: 'professional@example.com' })
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
})

describe('professional verification service', () => {
  it('returns the authenticated professional verification record', async () => {
    repository.findByPersonId.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', prcId: 'PRC-123', ptrNumber: 'PTR-123' })
    await expect(professionalService.getMine({ userId: 'user-1', appId: 'obo-app' })).resolves.toMatchObject({ id: 'professional-1', status: 'VERIFIED' })
    expect(repository.findPersonByUserId).toHaveBeenCalledWith('user-1')
    expect(repository.findByPersonId).toHaveBeenCalledWith('person-1', 'obo-app')
  })

  it('records an accepted verification decision transactionally', async () => {
    repository.findById.mockResolvedValue({ id: 'professional-1', personId: 'person-1', person: { userId: 2 }, status: 'PENDING_VERIFICATION', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123', professionalRole: 'ARCHITECT' })
    await expect(professionalService.decideVerification({ id: 'professional-1', appId: 'obo-app', actorId: 3, decision: 'ACCEPTED' })).resolves.toMatchObject({ status: 'VERIFIED' })
    expect(repository.findById).toHaveBeenCalledWith('professional-1', 'obo-app')
    expect(repository.update).toHaveBeenCalledWith('professional-1', 'obo-app', expect.objectContaining({ status: 'VERIFIED', verifiedByUserId: 3 }), expect.anything())
    expect(repository.addDecision).toHaveBeenCalled()
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'obo.professional.verification.decided', context: expect.objectContaining({ appId: 'obo-app' }), db: expect.anything() }))
  })

  it('requires an application context for verification lookup', async () => {
    await expect(professionalService.getMine({ userId: 'user-1' })).rejects.toThrow('Application context is required.')
    expect(repository.findByPersonId).not.toHaveBeenCalled()
  })
})
