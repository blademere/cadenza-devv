import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/modules/obo/receiving/receiving.repository.js', () => ({
  findApplication: vi.fn(),
  withTransaction: vi.fn(),
  updateApplication: vi.fn(),
  addDecision: vi.fn(),
  findPersonNotificationContext: vi.fn(),
}))

vi.mock('../../../../src/modules/obo/application-documents/application-document.service.js', () => ({
  ensureChecklist: vi.fn(),
  validateRequiredDocuments: vi.fn()
}))

vi.mock('../../../../src/platform/workflow/workflow.service.js', () => ({
  getWorkflowInstance: vi.fn(),
  transitionWorkflow: vi.fn()
}))

vi.mock('../../../../src/features/appointments/appointment.service.js', () => ({
  getAppointmentForReference: vi.fn(),
}))

vi.mock('../../../../src/features/tasks/tasks.service.js', () => ({
  create: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
}))

vi.mock('../../../../src/modules/obo/notification-context.js', () => ({
  getNotificationContext: vi.fn().mockResolvedValue({})
}))

import * as repository from '../../../../src/modules/obo/receiving/receiving.repository.js'
import * as applicationDocumentService from '../../../../src/modules/obo/application-documents/application-document.service.js'
import * as workflowService from '../../../../src/platform/workflow/workflow.service.js'
import * as appointmentService from '../../../../src/features/appointments/appointment.service.js'
import * as taskService from '../../../../src/features/tasks/tasks.service.js'
import { receiveHardcopy, decide } from '../../../../src/modules/obo/receiving/receiving.service.js'

const application = {
  id: 'app-1',
  caseId: 'case-1',
  workflowInstanceId: 'workflow-1',
  clientPersonId: 'person-1',
  referenceNumber: 'PP-001',
  permitType: { name: 'Building Permit' },
  submissionAppointment: { appointmentId: 'appointment-1' }
}

const workflow = {
  id: 'workflow-1',
  currentStep: { key: 'SUBMISSION_SCHEDULED' }
}

beforeEach(() => {
  vi.clearAllMocks()
  repository.findApplication.mockResolvedValue(application)
  workflowService.getWorkflowInstance.mockResolvedValue(workflow)
  appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() - 60_000) } })
  repository.withTransaction.mockImplementation((callback) => callback({}))
  repository.updateApplication.mockResolvedValue({ ...application, submittedAt: new Date() })
  applicationDocumentService.ensureChecklist.mockResolvedValue([])
  applicationDocumentService.validateRequiredDocuments.mockResolvedValue(true)
  taskService.list.mockResolvedValue([])
  taskService.create.mockResolvedValue({ id: 'task-new' })
  taskService.update.mockResolvedValue({ id: 'task-1', status: 'DONE' })
})

describe('receiving service', () => {
  it('receives a scheduled hardcopy submission and creates shared receiving tasks', async () => {
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    await receiveHardcopy({ id: 'app-1', actorId: 'user-1' })
    expect(applicationDocumentService.ensureChecklist).toHaveBeenCalledWith(application, expect.anything())
    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'workflow-1', transitionKey: 'RECEIVE_HARDCOPY', actorId: 'user-1' }))
    expect(repository.updateApplication).toHaveBeenCalledWith('app-1', expect.objectContaining({ submittedAt: expect.any(Date) }), expect.anything())
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', metadata: expect.objectContaining({ taskType: 'VERIFY_DOCUMENTS', applicationId: 'app-1' }) }), { db: expect.anything() })
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', metadata: expect.objectContaining({ taskType: 'EVALUATE_APPLICATION', applicationId: 'app-1' }) }), { db: expect.anything() })
  })

  it('completes open review and receiving tasks when hardcopy is received', async () => {
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    taskService.list.mockResolvedValue([
      { id: 'review-task', status: 'OPEN', metadata: { taskType: 'REVIEW_APPLICATION', applicationId: 'app-1' } },
      { id: 'receive-task', status: 'OPEN', metadata: { taskType: 'RECEIVE_HARD_COPY', applicationId: 'app-1' } },
      { id: 'other-task', status: 'OPEN', metadata: { taskType: 'OTHER', applicationId: 'app-1' } },
    ])
    await receiveHardcopy({ id: 'app-1', actorId: 'user-1' })
    expect(taskService.update).toHaveBeenCalledTimes(2)
    expect(taskService.update).toHaveBeenCalledWith('review-task', expect.objectContaining({ status: 'DONE' }), { db: expect.anything() })
    expect(taskService.update).toHaveBeenCalledWith('receive-task', expect.objectContaining({ status: 'DONE' }), { db: expect.anything() })
  })

  it('rejects receiving before the appointment starts', async () => {
    appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() + 60_000) } })
    await expect(receiveHardcopy({ id: 'app-1', actorId: 'user-1' })).rejects.toThrow('has not started yet')
    expect(workflowService.transitionWorkflow).not.toHaveBeenCalled()
  })

  it('rejects a receiving decision before the application is received', async () => {
    await expect(decide({ id: 'app-1', actorId: 'user-1', decision: 'ACCEPTED' })).rejects.toThrow('must be received')
  })

  it('requires a reason for a declined application', async () => {
    workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    await expect(decide({ id: 'app-1', actorId: 'user-1', decision: 'DECLINED' })).rejects.toThrow('reason is required')
    expect(workflowService.transitionWorkflow).not.toHaveBeenCalled()
  })

  it('accepts a received application and transitions it for inspection', async () => {
    workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'FOR_INSPECTION' } })
    repository.updateApplication.mockResolvedValue({ ...application })
    repository.addDecision.mockResolvedValue({ id: 'decision-1' })
    taskService.list.mockResolvedValue([
      { id: 'verify-task', status: 'OPEN', metadata: { taskType: 'VERIFY_DOCUMENTS', applicationId: 'app-1' } },
      { id: 'evaluate-task', status: 'OPEN', metadata: { taskType: 'EVALUATE_APPLICATION', applicationId: 'app-1' } },
    ])
    const result = await decide({ id: 'app-1', actorId: 'user-1', decision: 'ACCEPTED' })
    expect(applicationDocumentService.validateRequiredDocuments).toHaveBeenCalledWith({ applicationId: 'app-1', application, db: expect.anything() })
    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ transitionKey: 'ACCEPT_FOR_INSPECTION', metadata: expect.objectContaining({ decision: 'ACCEPTED' }) }))
    expect(repository.addDecision).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 'app-1', decision: 'ACCEPTED', reason: null, decidedByUserId: 'user-1' }), expect.anything())
    expect(taskService.update).toHaveBeenCalledTimes(2)
    expect(result.status).toBe('FOR_INSPECTION')
  })

  it('declines a received application with a required reason', async () => {
    workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'DECLINED' } })
    repository.updateApplication.mockResolvedValue({ ...application })
    repository.addDecision.mockResolvedValue({ id: 'decision-1' })
    const result = await decide({ id: 'app-1', actorId: 'user-1', decision: 'DECLINED', reason: 'Incomplete hardcopy documents' })
    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ transitionKey: 'DECLINE', metadata: expect.objectContaining({ decision: 'DECLINED', reason: 'Incomplete hardcopy documents' }) }))
    expect(repository.addDecision).toHaveBeenCalledWith(expect.objectContaining({ decision: 'DECLINED', reason: 'Incomplete hardcopy documents' }), expect.anything())
    expect(result.status).toBe('DECLINED')
  })
})
