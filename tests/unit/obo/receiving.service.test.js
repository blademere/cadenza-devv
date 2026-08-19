import { afterEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../src/modules/obo/receiving/receiving.repository')
const prismaModule = require('../../../src/infrastructure/database/prisma')

const spies = {
  findApplication: vi.spyOn(repository, 'findApplication'),
  findSubmissionAppointment: vi.spyOn(repository, 'findSubmissionAppointment'),
  listApplications: vi.spyOn(repository, 'listApplications'),
  updateApplication: vi.spyOn(repository, 'updateApplication'),
  addDecision: vi.spyOn(repository, 'addDecision'),
}

const transaction = vi.fn(async (callback) => callback({}))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })

const service = require('../../../src/modules/obo/receiving/receiving.service')

afterEach(() => vi.clearAllMocks())

const scheduled = {
  id: 'application-1',
  status: 'SUBMISSION_SCHEDULED',
  submittedAt: null,
  professional: { status: 'VERIFIED' },
  submissionAppointment: { appointmentId: 'appointment-1' },
}

describe('OBO receiving service', () => {
  it('lists applications awaiting receiving', async () => {
    spies.listApplications.mockResolvedValue([{ id: 'application-1' }])
    await expect(service.listApplications({ status: 'SUBMISSION_SCHEDULED' }))
      .resolves.toEqual([{ id: 'application-1' }])
  })

  it('receives valid hardcopy submissions', async () => {
    spies.findApplication.mockResolvedValue(scheduled)
    spies.findSubmissionAppointment.mockResolvedValue({
      status: 'SCHEDULED',
      slot: { startsAt: new Date(Date.now() - 60_000) },
    })
    spies.updateApplication.mockResolvedValue({ id: 'application-1', status: 'RECEIVING' })

    await expect(service.receiveHardcopy({ id: 'application-1' }))
      .resolves.toMatchObject({ status: 'RECEIVING' })
    expect(spies.updateApplication).toHaveBeenCalledWith('application-1', expect.objectContaining({ status: 'RECEIVING' }))
  })

  it('rejects invalid receiving conditions', async () => {
    spies.findApplication.mockResolvedValue(null)
    await expect(service.receiveHardcopy({ id: 'missing' })).rejects.toThrow('not found')

    spies.findApplication.mockResolvedValue({ ...scheduled, status: 'DRAFT' })
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('Only scheduled applications')

    spies.findApplication.mockResolvedValue({ ...scheduled, submissionAppointment: null })
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('appointment is required')

    spies.findApplication.mockResolvedValue(scheduled)
    spies.findSubmissionAppointment.mockResolvedValue(null)
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('no longer exists')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'CANCELLED', slot: { startsAt: new Date(Date.now() - 60_000) } })
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('not valid for receiving')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() + 60_000) } })
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('has not started')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() - 60_000) } })
    spies.findApplication.mockResolvedValue({ ...scheduled, professional: { status: 'PENDING_VERIFICATION' } })
    await expect(service.receiveHardcopy({ id: 'application-1' })).rejects.toThrow('professional is not verified')
  })

  it('accepts a received application and moves it to inspection', async () => {
    spies.findApplication.mockResolvedValue({ id: 'application-1', status: 'RECEIVING' })
    spies.updateApplication.mockResolvedValue({ id: 'application-1', status: 'FOR_INSPECTION' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })

    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'ACCEPTED' }))
      .resolves.toMatchObject({ status: 'FOR_INSPECTION' })
    expect(spies.addDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'ACCEPTED', decidedByUserId: 'officer-1' }), expect.any(Object))
  })

  it('declines a received application only with a reason', async () => {
    spies.findApplication.mockResolvedValue({ id: 'application-1', status: 'RECEIVING' })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'DECLINED' }))
      .rejects.toThrow('reason is required')

    spies.updateApplication.mockResolvedValue({ id: 'application-1', status: 'DECLINED' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'DECLINED', reason: 'Missing hardcopy requirements' }))
      .resolves.toMatchObject({ status: 'DECLINED' })
  })

  it('rejects decisions for missing or not-yet-received applications', async () => {
    spies.findApplication.mockResolvedValue(null)
    await expect(service.decide({ id: 'missing', actorId: 'officer-1', decision: 'ACCEPTED' })).rejects.toThrow('not found')

    spies.findApplication.mockResolvedValue({ id: 'application-1', status: 'SUBMISSION_SCHEDULED' })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'ACCEPTED' }))
      .rejects.toThrow('must be received')
  })
})
