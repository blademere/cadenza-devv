import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../src/modules/obo/receiving/receiving.repository')
const workflowService = require('../../../src/platform/workflow/workflow.service')
const prismaModule = require('../../../src/infrastructure/database/prisma')

const transaction = vi.fn(async (callback) => callback({}))
vi.spyOn(prismaModule, 'getPrismaClient').mockReturnValue({ $transaction: transaction })

const spies = {
  findApplication: vi.spyOn(repository, 'findApplication'),
  findWorkflowInstance: vi.spyOn(repository, 'findWorkflowInstance'),
  findSubmissionAppointment: vi.spyOn(repository, 'findSubmissionAppointment'),
  listApplications: vi.spyOn(repository, 'listApplications'),
  updateApplication: vi.spyOn(repository, 'updateApplication'),
  addDecision: vi.spyOn(repository, 'addDecision'),
  transitionWorkflow: vi.spyOn(workflowService, 'transitionWorkflow'),
}

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } })
  spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
})

const service = require('../../../src/modules/obo/receiving/receiving.service')

const scheduled = {
  id: 'application-1',
  workflowInstanceId: 'workflow-1',
  submittedAt: null,
  professional: { status: 'VERIFIED' },
  submissionAppointment: { appointmentId: 'appointment-1' },
}

describe('OBO receiving service', () => {
  it('lists applications awaiting receiving', async () => {
    spies.listApplications.mockResolvedValue([{ id: 'application-1', status: 'SUBMISSION_SCHEDULED' }])
    await expect(service.listApplications({ status: 'SUBMISSION_SCHEDULED' }))
      .resolves.toEqual([{ id: 'application-1', status: 'SUBMISSION_SCHEDULED' }])
  })

  it('receives valid hardcopy submissions through the workflow engine', async () => {
    spies.findApplication.mockResolvedValue(scheduled)
    spies.findSubmissionAppointment.mockResolvedValue({ status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() - 60_000) } })
    spies.updateApplication.mockResolvedValue({ id: 'application-1' })

    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).resolves.toMatchObject({ id: 'application-1' })
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'workflow-1', transitionKey: 'RECEIVE_HARDCOPY', actorId: 'officer-1' }))
    expect(spies.updateApplication).toHaveBeenCalledWith('application-1', expect.objectContaining({ submittedAt: expect.any(Date) }))
  })

  it('rejects invalid receiving conditions', async () => {
    spies.findApplication.mockResolvedValue(null)
    await expect(service.receiveHardcopy({ id: 'missing', actorId: 'officer-1' })).rejects.toThrow('not found')

    spies.findApplication.mockResolvedValue(scheduled)
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DRAFT' } })
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('Only scheduled applications')

    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } })
    spies.findApplication.mockResolvedValue({ ...scheduled, submissionAppointment: null })
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('appointment is required')

    spies.findApplication.mockResolvedValue(scheduled)
    spies.findSubmissionAppointment.mockResolvedValue(null)
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('no longer exists')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'CANCELLED', slot: { startsAt: new Date(Date.now() - 60_000) } })
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('not valid for receiving')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() + 60_000) } })
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('has not started')

    spies.findSubmissionAppointment.mockResolvedValue({ status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() - 60_000) } })
    spies.findApplication.mockResolvedValue({ ...scheduled, professional: { status: 'PENDING_VERIFICATION' } })
    await expect(service.receiveHardcopy({ id: 'application-1', actorId: 'officer-1' })).rejects.toThrow('professional is not verified')
  })

  it('accepts a received application and moves it to inspection', async () => {
    spies.findApplication.mockResolvedValue({ ...scheduled, submissionAppointment: null })
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'FOR_INSPECTION' } })
    spies.updateApplication.mockResolvedValue({ id: 'application-1' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })

    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'ACCEPTED' })).resolves.toMatchObject({ status: 'FOR_INSPECTION' })
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ transitionKey: 'ACCEPT_FOR_INSPECTION' }))
    expect(spies.addDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'ACCEPTED', decidedByUserId: 'officer-1' }), expect.any(Object))
  })

  it('declines a received application only with a reason', async () => {
    spies.findApplication.mockResolvedValue(scheduled)
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'DECLINED' })).rejects.toThrow('reason is required')

    spies.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DECLINED' } })
    spies.updateApplication.mockResolvedValue({ id: 'application-1' })
    spies.addDecision.mockResolvedValue({ id: 'decision-1' })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'DECLINED', reason: 'Missing hardcopy requirements' })).resolves.toMatchObject({ status: 'DECLINED' })
    expect(spies.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ transitionKey: 'DECLINE' }))
  })

  it('rejects decisions for missing or not-yet-received applications', async () => {
    spies.findApplication.mockResolvedValue(null)
    await expect(service.decide({ id: 'missing', actorId: 'officer-1', decision: 'ACCEPTED' })).rejects.toThrow('not found')

    spies.findApplication.mockResolvedValue(scheduled)
    spies.findWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } })
    await expect(service.decide({ id: 'application-1', actorId: 'officer-1', decision: 'ACCEPTED' })).rejects.toThrow('must be received')
  })
})
