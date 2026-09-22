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
  repository.create.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
  repository.withTransaction.mockImplementation(async (callback) => callback({ name: 'transaction' }))
  repository.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', verifiedAt: new Date('2026-08-17T07:00:00.000Z') })
  repository.addDecision.mockResolvedValue({ id: 'decision-1' })
  repository.findPersonById.mockResolvedValue({ userId: 2, email: 'professional@example.com' })
  peopleService.getByUserId.mockResolvedValue({ id: 'person-1', userId: 'user-1' })
  peopleService.create.mockResolvedValue({ id: 'person-1', userId: 7 })
  peopleService.update.mockResolvedValue({ id: 'person-1', userId: 7, firstName: 'Jane', lastName: 'Doe' })
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
})

describe('professional verification service', () => {
  it('applies for verification with PRC and PTR credentials and generates a registration number', async () => {
    await expect(professionalService.applyForVerification({ appId: 'obo-app', userId: 'user-1', prcId: '  PRC-123  ', ptrNumber: '  PTR-2026-123  ' })).resolves.toMatchObject({ status: 'PENDING_VERIFICATION' })
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', personId: 'person-1', prcId: 'PRC-123', ptrNumber: 'PTR-2026-123', registrationNumber: expect.stringMatching(/^PRO-\d{8}-[A-F0-9]{8}$/) }))
  })

  it('rejects invalid credentials and duplicate applications', async () => {
    await expect(professionalService.applyForVerification({ appId: 'obo-app', userId: 'user-1', prcId: ' ', ptrNumber: 'PTR-123' })).rejects.toThrow('prcId is required.')
    await expect(professionalService.applyForVerification({ appId: 'obo-app', userId: 'user-1', prcId: 'PRC-123', ptrNumber: ' ' })).rejects.toThrow('ptrNumber is required.')
    repository.findPersonByUserId.mockResolvedValue(null)
    await expect(professionalService.applyForVerification({ appId: 'obo-app', userId: 'user-1', prcId: 'PRC-123', ptrNumber: 'PTR-123' })).rejects.toThrow('does not have a person profile')
    repository.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    repository.findByPersonId.mockResolvedValue({ id: 'professional-1' })
    await expect(professionalService.applyForVerification({ appId: 'obo-app', userId: 'user-1', prcId: 'PRC-123', ptrNumber: 'PTR-123' })).rejects.toThrow('already exists')
  })

  it('returns the authenticated professional verification record within the application', async () => {
    repository.findByPersonId.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', prcId: 'PRC-123', ptrNumber: 'PTR-123' })
    await expect(professionalService.getMine({ userId: 'user-1', appId: 'obo-app' })).resolves.toMatchObject({ id: 'professional-1', status: 'VERIFIED' })
    expect(repository.findPersonByUserId).toHaveBeenCalledWith('user-1')
    expect(repository.findByPersonId).toHaveBeenCalledWith('person-1', 'obo-app')
  })

  it('rejects a professional from deciding their own application', async () => {
    repository.findById.mockResolvedValue({ id: 'professional-1', personId: 'person-1', person: { userId: 1 }, status: 'PENDING_VERIFICATION' })
    await expect(professionalService.decideVerification({ id: 'professional-1', appId: 'obo-app', actorId: 1, decision: 'ACCEPTED' })).rejects.toThrow('cannot approve or decline their own application')
    expect(repository.update).not.toHaveBeenCalled()
    expect(repository.addDecision).not.toHaveBeenCalled()
  })

  it('records an accepted verification decision transactionally', async () => {
    repository.findById.mockResolvedValue({ id: 'professional-1', personId: 'person-1', person: { userId: 2 }, status: 'PENDING_VERIFICATION', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123', professionalRole: 'ARCHITECT' })
    await expect(professionalService.decideVerification({ id: 'professional-1', appId: 'obo-app', actorId: 3, decision: 'ACCEPTED' })).resolves.toMatchObject({ status: 'VERIFIED' })
    expect(repository.findById).toHaveBeenCalledWith('professional-1', 'obo-app')
    expect(repository.update).toHaveBeenCalledWith('professional-1', 'obo-app', expect.objectContaining({ status: 'VERIFIED', verifiedByUserId: 3 }), expect.anything())
    expect(repository.addDecision).toHaveBeenCalled()
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'obo.professional.verification.decided', context: expect.objectContaining({ appId: 'obo-app', prcId: 'PRC-123', ptrNumber: 'PTR-123' }), db: expect.anything() }))
  })

  it('requires a reason when declining verification', async () => {
    repository.findById.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION', person: { userId: 2 } })
    await expect(professionalService.decideVerification({ id: 'professional-1', appId: 'obo-app', actorId: 3, decision: 'DECLINED' })).rejects.toThrow('reason is required')
  })

  it('rejects unknown or already-decided professionals', async () => {
    repository.findById.mockResolvedValue(null)
    await expect(professionalService.decideVerification({ id: 'missing', appId: 'obo-app', actorId: 3, decision: 'ACCEPTED' })).rejects.toThrow('not found')
    repository.findById.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' })
    await expect(professionalService.decideVerification({ id: 'professional-1', appId: 'obo-app', actorId: 3, decision: 'DECLINED', reason: 'Invalid credentials' })).rejects.toThrow('not awaiting verification')
  })

  it('requires an application context for verification operations', async () => {
    await expect(professionalService.getMine({ userId: 'user-1' })).rejects.toThrow('Application id is required for application-scoped data access.')
    await expect(professionalService.applyForVerification({ userId: 'user-1', prcId: 'PRC-1', ptrNumber: 'PTR-1' })).rejects.toThrow('Application id is required for application-scoped data access.')
    expect(repository.findByPersonId).not.toHaveBeenCalled()
  })
})

describe('professional person profile workflow', () => {
  it('retrieves the authenticated user person profile through the shared people feature', async () => {
    peopleService.getByUserId.mockResolvedValue({ id: 'person-1', userId: 7 })
    await expect(professionalService.getProfile({ userId: 7 })).resolves.toMatchObject({ id: 'person-1', userId: 7 })
    expect(peopleService.getByUserId).toHaveBeenCalledWith(7)
  })

  it('creates the person profile independently when no profile exists', async () => {
    repository.findPersonByUserId.mockResolvedValue(null)
    await expect(professionalService.createProfile({ userId: 7, firstName: 'Jane', lastName: 'Doe' })).resolves.toMatchObject({ id: 'person-1', userId: 7 })
    expect(peopleService.create).toHaveBeenCalledWith({ userId: 7, firstName: 'Jane', lastName: 'Doe' })
  })

  it('rejects profile creation when a person profile already exists', async () => {
    repository.findPersonByUserId.mockResolvedValue({ id: 'person-1', userId: 7 })
    await expect(professionalService.createProfile({ userId: 7, firstName: 'Jane', lastName: 'Doe' })).rejects.toThrow('Professional person profile already exists.')
    expect(peopleService.create).not.toHaveBeenCalled()
  })

  it('updates an existing person profile without creating a duplicate', async () => {
    repository.findPersonByUserId.mockResolvedValue({ id: 'person-1', userId: 7 })
    await expect(professionalService.updateProfile({ userId: 7, firstName: 'Jane', lastName: 'Doe' })).resolves.toMatchObject({ id: 'person-1', firstName: 'Jane' })
    expect(peopleService.update).toHaveBeenCalledWith('person-1', { firstName: 'Jane', lastName: 'Doe' })
    expect(peopleService.create).not.toHaveBeenCalled()
  })

  it('rejects profile updates when no person profile exists', async () => {
    repository.findPersonByUserId.mockResolvedValue(null)
    await expect(professionalService.updateProfile({ userId: 7, firstName: 'Jane', lastName: 'Doe' })).rejects.toThrow('Professional person profile not found.')
    expect(peopleService.create).not.toHaveBeenCalled()
    expect(peopleService.update).not.toHaveBeenCalled()
  })
})
