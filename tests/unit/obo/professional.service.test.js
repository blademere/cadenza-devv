import { afterEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../src/modules/obo/professionals/professional.repository')
const prismaModule = require('../../../src/infrastructure/database/prisma')

const spies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'),
  findByPersonId: vi.spyOn(repository, 'findByPersonId'),
  create: vi.spyOn(repository, 'create'),
  listPending: vi.spyOn(repository, 'listPending'),
  listVerified: vi.spyOn(repository, 'listVerified'),
  findById: vi.spyOn(repository, 'findById'),
  update: vi.spyOn(repository, 'update'),
  addDecision: vi.spyOn(repository, 'addDecision'),
}

const transaction = vi.fn(async (callback) => callback({}))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })

const service = require('../../../src/modules/obo/professionals/professional.service')

afterEach(() => vi.clearAllMocks())

describe('OBO professional service', () => {
  it('applies for verification and normalizes the registration number', async () => {
    spies.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    spies.findByPersonId.mockResolvedValue(null)
    spies.create.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })

    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: '  PRC-123  ' }))
      .resolves.toMatchObject({ status: 'PENDING_VERIFICATION' })
    expect(spies.create).toHaveBeenCalledWith({ personId: 'person-1', userId: 'user-1', registrationNumber: 'PRC-123' })
  })

  it('rejects invalid or duplicate verification applications', async () => {
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: ' ' }))
      .rejects.toThrow('registrationNumber is required.')

    spies.findPersonByUserId.mockResolvedValue(null)
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'PRC-123' }))
      .rejects.toThrow('does not have a person profile')

    spies.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    spies.findByPersonId.mockResolvedValue({ id: 'professional-1' })
    await expect(service.applyForVerification({ userId: 'user-1', registrationNumber: 'PRC-123' }))
      .rejects.toThrow('already exists')
  })

  it('lists pending and verified professionals', async () => {
    spies.listPending.mockResolvedValue([{ id: 'pending-1' }])
    spies.listVerified.mockResolvedValue([{ id: 'verified-1' }])

    await expect(service.listPending()).resolves.toEqual([{ id: 'pending-1' }])
    await expect(service.listVerified()).resolves.toEqual([{ id: 'verified-1' }])
  })

  it('records an accepted verification decision transactionally', async () => {
    spies.findById.mockResolvedValue({ id: 'professional-1', status: 'PENDING_VERIFICATION' })
    spies.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })

    await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'ACCEPTED' }))
      .resolves.toMatchObject({ status: 'VERIFIED' })
    expect(spies.update).toHaveBeenCalledWith('professional-1', expect.objectContaining({ status: 'VERIFIED', verifiedByUserId: 'officer-1' }), expect.any(Object))
    expect(spies.addDecision).toHaveBeenCalled()
  })

  it('rejects unknown or already-decided professionals', async () => {
    spies.findById.mockResolvedValue(null)
    await expect(service.decideVerification({ id: 'missing', actorId: 'officer-1', decision: 'ACCEPTED' }))
      .rejects.toThrow('not found')

    spies.findById.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' })
    await expect(service.decideVerification({ id: 'professional-1', actorId: 'officer-1', decision: 'DECLINED' }))
      .rejects.toThrow('not awaiting verification')
  })
})
