import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/modules/obo/receiving/receiving.repository.js', () => ({
  findApplication: vi.fn(),
  findWorkflowInstance: vi.fn(),
  findSubmissionAppointment: vi.fn(),
  withTransaction: vi.fn(),
  updateApplication: vi.fn(),
  addDecision: vi.fn(),
  findPersonNotificationContext: vi.fn()
}))

vi.mock('../../../../src/platform/workflow/workflow.service.js', () => ({
  transitionWorkflow: vi.fn()
}))

vi.mock('../../../../src/modules/obo/notification-context.js', () => ({
  getNotificationContext: vi.fn().mockResolvedValue({})
}))

import * as repository from '../../../../src/modules/obo/receiving/receiving.repository.js'
import * as workflowService from '../../../../src/platform/workflow/workflow.service.js'
import { receiveHardcopy, decide } from '../../../../src/modules/obo/receiving/receiving.service.js'

const application = {
  id: 'app-1',
  workflowInstanceId: 'workflow-1',
  clientPersonId: 'person-1',
  referenceNumber: 'PP-001',
  permitType: { name: 'Building Permit' },
  professional: { status: 'VERIFIED' },
  submissionAppointment: { appointmentId: 'appointment-1' }
}

const workflow = {
  id: 'workflow-1',
  currentStep: { key: 'SUBMISSION_SCHEDULED' }
}

beforeEach(() => {
  vi.clearAllMocks()
  repository.findApplication.mockResolvedValue(application)
  repository.findWorkflowInstance.mockResolvedValue(workflow)
  repository.findSubmissionAppointment.mockResolvedValue({
    id: 'appointment-1',
    status: 'SCHEDULED',
    slot: { startsAt: new Date(Date.now() - 60_000) }
  })
  repository.withTransaction.mockImplementation((callback) => callback({}))
  repository.updateApplication.mockResolvedValue({ ...application, submittedAt: new Date() })
})

describe('receiving service', () => {
  it('receives a scheduled hardcopy submission and transitions to receiving', async () => {
    workflowService.transitionWorkflow.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'RECEIVING' }
    })

    await receiveHardcopy({ id: 'app-1', actorId: 'user-1' })

    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      instanceId: 'workflow-1',
      transitionKey: 'RECEIVE_HARDCOPY',
      actorId: 'user-1'
    }))
    expect(repository.updateApplication).toHaveBeenCalledWith('app-1', expect.objectContaining({ submittedAt: expect.any(Date) }), expect.anything())
  })

  it('rejects receiving before the appointment starts', async () => {
    repository.findSubmissionAppointment.mockResolvedValue({
      id: 'appointment-1',
      status: 'SCHEDULED',
      slot: { startsAt: new Date(Date.now() + 60_000) }
    })

    await expect(receiveHardcopy({ id: 'app-1', actorId: 'user-1' })).rejects.toThrow('has not started yet')
    expect(workflowService.transitionWorkflow).not.toHaveBeenCalled()
  })

  it('rejects receiving when the professional is not verified', async () => {
    repository.findApplication.mockResolvedValue({
      ...application,
      professional: { status: 'PENDING_VERIFICATION' }
    })

    await expect(receiveHardcopy({ id: 'app-1', actorId: 'user-1' })).rejects.toThrow('not verified')
    expect(workflowService.transitionWorkflow).not.toHaveBeenCalled()
  })

  it('rejects a receiving decision before the application is received', async () => {
    await expect(decide({ id: 'app-1', actorId: 'user-1', decision: 'ACCEPTED' })).rejects.toThrow('must be received')
  })

  it('requires a reason for a declined application', async () => {
    repository.findWorkflowInstance.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'RECEIVING' }
    })

    await expect(decide({ id: 'app-1', actorId: 'user-1', decision: 'DECLINED' })).rejects.toThrow('reason is required')
    expect(workflowService.transitionWorkflow).not.toHaveBeenCalled()
  })

  it('accepts a received application and transitions it for inspection', async () => {
    repository.findWorkflowInstance.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'RECEIVING' }
    })
    workflowService.transitionWorkflow.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'FOR_INSPECTION' }
    })
    repository.updateApplication.mockResolvedValue({ ...application })
    repository.addDecision.mockResolvedValue({ id: 'decision-1' })

    const result = await decide({ id: 'app-1', actorId: 'user-1', decision: 'ACCEPTED' })

    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      transitionKey: 'ACCEPT_FOR_INSPECTION',
      metadata: expect.objectContaining({ decision: 'ACCEPTED' })
    }))
    expect(repository.addDecision).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'app-1',
      decision: 'ACCEPTED',
      reason: null,
      decidedByUserId: 'user-1'
    }), expect.anything())
    expect(result.status).toBe('FOR_INSPECTION')
  })

  it('declines a received application with a required reason', async () => {
    repository.findWorkflowInstance.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'RECEIVING' }
    })
    workflowService.transitionWorkflow.mockResolvedValue({
      id: 'workflow-1',
      currentStep: { key: 'DECLINED' }
    })
    repository.updateApplication.mockResolvedValue({ ...application })
    repository.addDecision.mockResolvedValue({ id: 'decision-1' })

    const result = await decide({
      id: 'app-1',
      actorId: 'user-1',
      decision: 'DECLINED',
      reason: 'Incomplete hardcopy documents'
    })

    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      transitionKey: 'DECLINE',
      metadata: expect.objectContaining({
        decision: 'DECLINED',
        reason: 'Incomplete hardcopy documents'
      })
    }))
    expect(repository.addDecision).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'DECLINED',
      reason: 'Incomplete hardcopy documents'
    }), expect.anything())
    expect(result.status).toBe('DECLINED')
  })
})
