import { afterEach, describe, expect, it, vi } from 'vitest'

const prismaModule = await import('../../../../src/infrastructure/database/prisma.js')
const eventBus = await import('../../../../src/platform/event-bus/event-bus.js')

const transaction = vi.fn(async (callback) =>
  callback({
    $queryRaw: vi
      .fn()
      .mockResolvedValue([
        { id: 'event-1', status: 'PENDING', attempts: 0, payload: {} },
      ]),
  })
)
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({
  $transaction: transaction,
})
vi.spyOn(eventBus, 'publish').mockResolvedValue({ id: 'event-1' })

const repository = await import('../../../../src/modules/obo/professionals/professional.repository.js')
const service = await import('../../../../src/modules/obo/professionals/professional.service.js')

const spies = {
  findPersonByUserId: vi.spyOn(repository, 'findPersonByUserId'),
  findByPersonId: vi.spyOn(repository, 'findByPersonId'),
  findByUserId: vi.spyOn(repository, 'findByUserId'),
  findById: vi.spyOn(repository, 'findById'),
  create: vi.spyOn(repository, 'create'),
  update: vi.spyOn(repository, 'update'),
  addDecision: vi.spyOn(repository, 'addDecision'),
  findPersonById: vi.spyOn(repository, 'findPersonById'),
}

afterEach(() => vi.clearAllMocks())

describe('OBO professional credentials', () => {
  it('requires PRC ID and PTR when applying for verification', async () => {
    await expect(
      service.applyForVerification({
        userId: 'user-1',
        registrationNumber: 'REG-1',
        prcId: '',
        ptrNumber: 'PTR-1',
      })
    ).rejects.toThrow('prcId is required.')
    await expect(
      service.applyForVerification({
        userId: 'user-1',
        registrationNumber: 'REG-1',
        prcId: 'PRC-1',
        ptrNumber: '',
      })
    ).rejects.toThrow('ptrNumber is required.')
  })

  it('persists normalized PRC and PTR credentials', async () => {
    spies.findPersonByUserId.mockResolvedValue({ id: 'person-1' })
    spies.findByPersonId.mockResolvedValue(null)
    spies.create.mockResolvedValue({
      id: 'professional-1',
      status: 'PENDING_VERIFICATION',
    })

    await service.applyForVerification({
      userId: 'user-1',
      registrationNumber: ' REG-1 ',
      prcId: ' PRC-1 ',
      ptrNumber: ' PTR-1 ',
    })

    expect(spies.create).toHaveBeenCalledWith({
      personId: 'person-1',
      userId: 'user-1',
      registrationNumber: 'REG-1',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })
  })

  it('allows the professional to retrieve their verification record', async () => {
    spies.findByUserId.mockResolvedValue({
      id: 'professional-1',
      status: 'VERIFIED',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })
    await expect(service.getMine({ userId: 'user-1' })).resolves.toMatchObject({
      status: 'VERIFIED',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })
  })

  it('requires a reason when the Receiving Officer declines professional verification', async () => {
    spies.findById.mockResolvedValue({
      id: 'professional-1',
      status: 'PENDING_VERIFICATION',
    })
    await expect(
      service.decideVerification({
        id: 'professional-1',
        actorId: 'officer-1',
        decision: 'DECLINED',
      })
    ).rejects.toThrow('reason is required')
  })

  it('includes PRC and PTR credentials in the verification decision event', async () => {
    spies.findById.mockResolvedValue({
      id: 'professional-1',
      personId: 'person-1',
      userId: 'professional-user-1',
      status: 'PENDING_VERIFICATION',
      registrationNumber: 'REG-1',
      prcId: 'PRC-1',
      ptrNumber: 'PTR-1',
    })
    spies.update.mockResolvedValue({ id: 'professional-1', status: 'VERIFIED' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })
    spies.findPersonById.mockResolvedValue({
      userId: 'professional-user-1',
      email: 'professional@example.com',
    })

    await service.decideVerification({
      id: 'professional-1',
      actorId: 'officer-1',
      decision: 'ACCEPTED',
    })

    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'obo.professional.verification.decided',
        context: expect.objectContaining({
          prcId: 'PRC-1',
          ptrNumber: 'PTR-1',
        }),
      })
    )
  })
})
