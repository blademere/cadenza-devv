import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repository: {
    findPersonByUserId: vi.fn(),
    findPersonById: vi.fn(),
    findByPersonId: vi.fn(),
    findByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    listPending: vi.fn(),
    listVerified: vi.fn(),
    update: vi.fn(),
    addDecision: vi.fn(),
    withTransaction: vi.fn(),
  },
  publish: vi.fn(),
}))

vi.mock('../../../src/modules/obo/professionals/professional.repository.js', () => mocks.repository)
vi.mock('../../../src/platform/event-bus/event-bus.js', () => ({ publish: mocks.publish }))

const service = await import('../../../src/modules/obo/professionals/professional.service.js')

afterEach(() => vi.clearAllMocks())

describe('OBO professional service', () => {
  it('applies for verification with PRC and PTR credentials and normalizes them', async () => {
    mocks.repository.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    mocks.repository.findByPersonId.mockResolvedValue(null)
    mocks.repository.create.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })

    await expect(service.applyForVerification({
      userId: 'user-1',
      prcId: '  PRC-123  ',
      ptrNumber: '  PTR-2026-123  ',
    })).resolves.toMatchObject({ status: 'PENDING_VERIFICATION' })

    expect(mocks.repository.create).toHaveBeenCalledWith(expect.objectContaining({
      personId: 'person-1',
      userId: 'user-1',
      prcId: 'PRC-123',
      ptrNumber: 'PTR-2026-123',
      registrationNumber: expect.stringMatching(/^PRO-\d{8}-[A-F0-9]{8}$/),
    }))
  })

  it('rejects invalid or duplicate verification applications', async () => {
    await expect(service.applyForVerification({
      userId: 'user-1',
      prcId: ' ',
      ptrNumber: 'PTR-123',
      professionalRole: 'ARCHITECT',
    })).rejects.toThrow('prcId is required.')

    await expect(service.applyForVerification({
      userId: 'user-1',
      prcId: 'PRC-123',
      ptrNumber: ' ',
      professionalRole: 'ARCHITECT',
    })).rejects.toThrow('ptrNumber is required.')

    mocks.repository.findPersonByUserId.mockResolvedValue(null)
    await expect(service.applyForVerification({
      userId: 'user-1',
      prcId: 'PRC-123',
      ptrNumber: 'PTR-123',
      professionalRole: 'ARCHITECT',
    })).rejects.toThrow('does not have a person profile')

    mocks.repository.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    mocks.repository.findByPersonId.mockResolvedValue({ id: 'professional-1' })
    await expect(service.applyForVerification({
      userId: 'user-1',
      prcId: 'PRC-123',
      ptrNumber: 'PTR-123',
      professionalRole: 'ARCHITECT',
    })).rejects.toThrow('already exists')
  })

  it('returns the authenticated professional verification record', async () => {
    mocks.repository.findByUserId.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', prcId: 'PRC-123', ptrNumber: 'PTR-123' })
    await expect(service.getMine({ userId: 'user-1' })).resolves.toMatchObject({ id: 'professional-1', status: 'VERIFIED' })
    expect(mocks.repository.findByUserId).toHaveBeenCalledWith('user-1')
  })

  it('rejects a professional from deciding their own application', async () => {
    mocks.repository.findById.mockResolvedValue({ id: 'professional-1', userId: 1, status: 'PENDING_VERIFICATION' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 1, decision: 'ACCEPTED' })).rejects.toThrow('cannot approve or decline their own application')
    expect(mocks.repository.update).not.toHaveBeenCalled()
    expect(mocks.repository.addDecision).not.toHaveBeenCalled()
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('records an accepted verification decision transactionally', async () => {
    const tx = { name: 'transaction' }
    mocks.repository.findById.mockResolvedValue({ id: 'professional-1', userId: 2, personId: 'person-1', status: 'PENDING_VERIFICATION', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123', professionalRole: 'ARCHITECT' })
    mocks.repository.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', verifiedAt: new Date('2026-08-17T07:00:00.000Z') })
    mocks.repository.addDecision.mockResolvedValue({ id: 'decision-1' })
    mocks.repository.findPersonById.mockResolvedValue({ userId: 2, email: 'professional@example.com' })
    mocks.repository.withTransaction.mockImplementation(async (callback) => callback(tx))
    mocks.publish.mockResolvedValue({ id: 'event-1' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 3, decision: 'ACCEPTED' })).resolves.toMatchObject({ status: 'VERIFIED' })
    expect(mocks.repository.update).toHaveBeenCalledWith('professional-1', expect.objectContaining({ status: 'VERIFIED', verifiedByUserId: 3 }), tx)
    expect(mocks.repository.addDecision).toHaveBeenCalled()
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ db: tx, event: 'obo.professional.verification.decided' }))
  })

  it('requires a reason when declining professional verification', async () => {
    mocks.repository.findById.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'DECLINED' })).rejects.toThrow('reason is required')
  })

  it('rejects unknown or already-decided professionals', async () => {
    mocks.repository.findById.mockResolvedValue(null)
    await expect(service.decideVerification({ id: 'missing', actorId: 'officer-1', decision: 'ACCEPTED' })).rejects.toThrow('not found')
    mocks.repository.findById.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'DECLINED', reason: 'Invalid credentials' })).rejects.toThrow('not awaiting verification')
  })
})
