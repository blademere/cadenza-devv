import { afterEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../../src/modules/obo/professionals/professional.repository')
const prismaModule = require('../../../../src/infrastructure/database/prisma')
const eventBus = require('../../../../src/platform/event-bus/event-bus')

const transaction = vi.fn(async (callback) => callback({ $queryRaw: vi.fn().mockResolvedValue([{ id: 'event-1', status: 'PENDING', attempts: 0, payload: {} }]) }))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })
vi.spyOn(eventBus, 'publish').mockResolvedValue({ id: 'event-1' })

const spies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'), findByPersonId: vi.spyOn(repository, 'findByPersonId'), findByUserId: vi.spyOn(repository, 'findByUserId'), findPersonById: vi.spyOn(repository, 'findPersonById'), create: vi.spyOn(repository, 'create'), listPending: vi.spyOn(repository, 'listPending'), listVerified: vi.spyOn(repository, 'listVerified'), findById: vi.spyOn(repository, 'findById'), update: vi.spyOn(repository, 'update'), addDecision: vi.spyOn(repository, 'addDecision'),
}

const service = require('../../../../src/modules/obo/professionals/professional.service')
afterEach(() => vi.clearAllMocks())

describe('OBO professional service', () => {
  it('applies for verification with PRC and PTR credentials and normalizes them', async () => {
    spies.findPersonByUserId.mockResolvedValue({ id: 'person-1' }); spies.findByPersonId.mockResolvedValue(null); spies.create.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: '  REG-123  ', prcId: '  PRC-123  ', ptrNumber: '  PTR-2026-123  ' })).resolves.toMatchObject({ status: 'PENDING_VERIFICATION' })
    expect(spies.create).toHaveBeenCalledWith({ personId: 'person-1', userId: 'user-1', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-2026-123' })
  })
  it('rejects invalid or duplicate verification applications', async () => {
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: ' ', prcId: 'PRC-123', ptrNumber: 'PTR-123' })).rejects.toThrow('registrationNumber is required.')
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'REG-123', prcId: ' ', ptrNumber: 'PTR-123' })).rejects.toThrow('prcId is required.')
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: ' ' })).rejects.toThrow('ptrNumber is required.')
    spies.findPersonByUserId.mockResolvedValue(null); await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123' })).rejects.toThrow('Complete your person profile before applying for professional verification.')
    spies.findPersonByUserId.mockResolvedValue({ id: 'person-1' }); spies.findByPersonId.mockResolvedValue({ id: 'professional-1' }); await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123' })).rejects.toThrow('already exists')
  })
  it('returns the authenticated professional verification record', async () => { spies.findByUserId.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED', prcId: 'PRC-123', ptrNumber: 'PTR-123' }); await expect(service.getMine({ userId: 'user-1' })).resolves.toMatchObject({ id: 'professional-1', status: 'VERIFIED' }); expect(spies.findByUserId).toHaveBeenCalledWith('user-1') })
  it('records an accepted verification decision transactionally', async () => {
    spies.findById.mockResolvedValue({ id: 'professional-1', personId: 'person-1', status: 'PENDING_VERIFICATION', registrationNumber: 'REG-123', prcId: 'PRC-123', ptrNumber: 'PTR-123' }); spies.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' }); spies.addDecision.mockResolvedValue({ id: 'decision-1' }); spies.findPersonById.mockResolvedValue({ userId: 'professional-user-1', email: 'professional@example.com' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'ACCEPTED' })).resolves.toMatchObject({ status: 'VERIFIED' }); expect(spies.update).toHaveBeenCalledWith('professional-1', expect.objectContaining({ status: 'VERIFIED', verifiedByUserId: 'officer-1' }), expect.any(Object)); expect(spies.addDecision).toHaveBeenCalled(); expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ db: expect.any(Object), event: 'obo.professional.verification.decided' }))
  })
  it('requires a reason when declining professional verification', async () => { spies.findById.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' }); await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'DECLINED' })).rejects.toThrow('reason is required') })
  it('rejects unknown or already-decided professionals', async () => { spies.findById.mockResolvedValue(null); await expect(service.decideVerification({ id: 'missing', actorId: 'officer-1', decision: 'ACCEPTED' })).rejects.toThrow('not found'); spies.findById.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' }); await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'DECLINED', reason: 'Invalid credentials' })).rejects.toThrow('not awaiting verification') })
})
