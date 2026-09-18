import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/obo/receiving/receiving.repository.js', () => ({
  findApplication: vi.fn(), withTransaction: vi.fn(), updateApplication: vi.fn(), addDecision: vi.fn(), findPersonNotificationContext: vi.fn(),
}))
vi.mock('../../../src/apps/obo/documents/document.service.js', () => ({ ensureChecklist: vi.fn(), validateRequiredDocuments: vi.fn() }))
vi.mock('../../../src/platform/workflow/workflow.service.js', () => ({ getWorkflowInstance: vi.fn(), transitionWorkflow: vi.fn() }))
vi.mock('../../../src/platform/event-bus/event-bus.js', () => ({ publish: vi.fn() }))
vi.mock('../../../src/features/appointments/appointment.service.js', () => ({ getAppointmentForReference: vi.fn() }))
vi.mock('../../../src/features/tasks/tasks.service.js', () => ({ create: vi.fn(), list: vi.fn(), update: vi.fn() }))
vi.mock('../../../src/apps/obo/notification-context.js', () => ({ getNotificationContext: vi.fn().mockResolvedValue({}) }))

import * as repository from '../../../src/apps/obo/receiving/receiving.repository.js'
import * as applicationDocumentService from '../../../src/apps/obo/documents/document.service.js'
import * as workflowService from '../../../src/platform/workflow/workflow.service.js'
import * as eventBus from '../../../src/platform/event-bus/event-bus.js'
import * as appointmentService from '../../../src/features/appointments/appointment.service.js'
import * as taskService from '../../../src/features/tasks/tasks.service.js'
import { receiveHardcopy, decide } from '../../../src/apps/obo/receiving/receiving.service.js'
import { hasReceivingTaskAccess } from '../../../src/apps/obo/receiving/receiving.authorization.js'

const application = {
  id: 'app-1', caseId: 'case-1', workflowInstanceId: 'workflow-1', clientPersonId: 'person-1', referenceNumber: 'PP-001', permitTypeId: 'permit-1', permitType: { name: 'Building Permit' }, submissionAppointment: { appointmentId: 'appointment-1' },
}
const workflow = { id: 'workflow-1', currentStep: { key: 'SUBMISSION_SCHEDULED' } }

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
  eventBus.publish.mockResolvedValue(undefined)
})

describe('OBO receiving service', () => {
  it('receives a scheduled hardcopy submission and creates shared receiving tasks', async () => {
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    await receiveHardcopy({ id: 'app-1', appId: 'obo-app', actorId: 'user-1' })
    expect(applicationDocumentService.ensureChecklist).toHaveBeenCalledWith(application, expect.anything())
    expect(workflowService.transitionWorkflow).toHaveBeenCalledWith(expect.objectContaining({ instanceId: 'workflow-1', transitionKey: 'RECEIVE_HARDCOPY', actorId: 'user-1' }))
    expect(repository.updateApplication).toHaveBeenCalledWith('app-1', 'obo-app', expect.objectContaining({ submittedAt: expect.any(Date) }), expect.anything())
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', metadata: expect.objectContaining({ taskType: 'VERIFY_DOCUMENTS', applicationId: 'app-1' }) }), { appId: 'obo-app', db: expect.anything() })
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', metadata: expect.objectContaining({ taskType: 'EVALUATE_APPLICATION', applicationId: 'app-1' }) }), { appId: 'obo-app', db: expect.anything() })
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'obo.permit_application.hardcopy.received', entityId: 'app-1', db: expect.anything() }))
  })

  it('completes open review and receiving tasks when hardcopy is received', async () => {
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    taskService.list.mockResolvedValue([
      { id: 'review-task', status: 'OPEN', metadata: { taskType: 'REVIEW_APPLICATION', applicationId: 'app-1' } },
      { id: 'receive-task', status: 'OPEN', metadata: { taskType: 'RECEIVE_HARD_COPY', applicationId: 'app-1' } },
      { id: 'other-task', status: 'OPEN', metadata: { taskType: 'OTHER', applicationId: 'other-app' } },
    ])
    await receiveHardcopy({ id: 'app-1', appId: 'obo-app', actorId: 'user-1' })
    expect(taskService.list).toHaveBeenCalledWith({ caseId: 'case-1', status: 'OPEN' }, { appId: 'obo-app', db: expect.anything() })
    expect(taskService.update).toHaveBeenCalledTimes(2)
    expect(taskService.update).toHaveBeenCalledWith('review-task', { status: 'DONE', completedAt: expect.any(Date) }, { appId: 'obo-app', db: expect.anything() })
    expect(taskService.update).toHaveBeenCalledWith('receive-task', { status: 'DONE', completedAt: expect.any(Date) }, { appId: 'obo-app', db: expect.anything() })
  })

  it('rejects receiving when the appointment has not started', async () => {
    appointmentService.getAppointmentForReference.mockResolvedValue({ id: 'appointment-1', status: 'SCHEDULED', slot: { startsAt: new Date(Date.now() + 60_000) } })
    await expect(receiveHardcopy({ id: 'app-1', appId: 'obo-app', actorId: 'user-1' })).rejects.toThrow('The hardcopy submission appointment has not started yet.')
  })

  it('accepts a received application and transitions it for inspection', async () => {
    workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    workflowService.transitionWorkflow.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'FOR_INSPECTION' } })
    repository.updateApplication.mockResolvedValue({ ...application })
    repository.addDecision.mockResolvedValue({ id: 'decision-1' })
    const result = await decide({ id: 'app-1', appId: 'obo-app', actorId: 'user-1', decision: 'ACCEPTED' })
    expect(result).toMatchObject({ id: 'app-1', status: 'FOR_INSPECTION' })
    expect(repository.updateApplication).toHaveBeenCalledWith('app-1', 'obo-app', expect.objectContaining({ acceptedByUserId: 'user-1' }), expect.anything())
  })

  it('requires a reason when declining an application', async () => {
    workflowService.getWorkflowInstance.mockResolvedValue({ id: 'workflow-1', currentStep: { key: 'RECEIVING' } })
    await expect(decide({ id: 'app-1', appId: 'obo-app', actorId: 'user-1', decision: 'DECLINED' })).rejects.toThrow('A reason is required when declining an application.')
  })
})

describe('receiving authorization', () => {
  it('allows receiving task access for the assigned receiving role', async () => {
    await expect(hasReceivingTaskAccess({ user: { id: 'user-1' }, resource: { appId: 'obo-app' } })).resolves.toBeDefined()
  })
})
