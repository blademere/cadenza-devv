import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import * as taskService from '../../../features/tasks/tasks.service.js'
import * as repository from './receiving.repository.js'
import * as applicationDocumentService from '../application-documents/application-document.service.js'
import { getNotificationContext } from '../notification-context.js'

const STATUS = Object.freeze({ SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })
const TASK_TYPE = Object.freeze({ REVIEW_APPLICATION: 'REVIEW_APPLICATION', RECEIVE_HARD_COPY: 'RECEIVE_HARD_COPY', VERIFY_DOCUMENTS: 'VERIFY_DOCUMENTS', EVALUATE_APPLICATION: 'EVALUATE_APPLICATION' })

const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) throw new ConflictError('Permit application is not attached to a workflow instance.')
  try {
    return await workflowService.getWorkflowInstance(application.workflowInstanceId)
  } catch (error) {
    if (error?.code === 'NOT_FOUND' || error?.status === 404) throw new ConflictError('Permit application workflow instance was not found.')
    throw error
  }
}

const hydrateApplication = async (application, db) => {
  if (!application) return application
  if (!application.submissionAppointment?.appointmentId) return application
  const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId, db })
  return { ...application, submissionAppointment: { ...application.submissionAppointment, appointment } }
}

const getApplication = async ({ id }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  return hydrateApplication({ ...application, status: workflow.currentStep.key })
}

const getForAuthorization = (id) => repository.findApplication(id)

const listApplications = async ({ status }) => {
  const applications = await repository.listApplications(status)
  const hydrated = await Promise.all(applications.map(async (application) => {
    const workflow = await getWorkflowState(application)
    if (status && workflow.currentStep.key !== status) return null
    if (!status && workflow.currentStep.key !== STATUS.SUBMISSION_SCHEDULED) return null
    return hydrateApplication({ ...application, status: workflow.currentStep.key })
  }))
  return hydrated.filter(Boolean)
}

const completeOpenTasks = async ({ caseId, applicationId, taskTypes, db }) => {
  const tasks = await taskService.list({ caseId, status: 'OPEN' }, { db })
  for (const task of tasks) {
    const metadata = task.metadata || {}
    if (metadata.applicationId !== applicationId || !taskTypes.includes(metadata.taskType)) continue
    await taskService.update(task.id, { status: 'DONE', completedAt: new Date() }, { db })
  }
}

const createTask = ({ caseId, applicationId, title, description, taskType, dueAt = null, db }) =>
  taskService.create({
    caseId,
    title,
    description,
    status: 'OPEN',
    priority: 'HIGH',
    dueAt,
    metadata: { source: 'obo-receiving', taskType, applicationId },
  }, { db })

const receiveHardcopy = async ({ id, actorId }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  if (workflow.currentStep.key !== STATUS.SUBMISSION_SCHEDULED) throw new ConflictError('Only scheduled applications can be received.')
  if (!application.submissionAppointment) throw new ConflictError('A hardcopy submission appointment is required.')
  const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId })
  if (!appointment) throw new ConflictError('The submission appointment no longer exists.')
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') throw new ConflictError('The submission appointment is not valid for receiving.')
  if (appointment.slot.startsAt > new Date()) throw new ConflictError('The hardcopy submission appointment has not started yet.')
  const submittedAt = application.submittedAt || new Date()
  await repository.withTransaction(async (tx) => {
    await applicationDocumentService.ensureChecklist(application, tx)
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'RECEIVE_HARDCOPY', actorId, metadata: { source: 'obo-receiving.receive', appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    await repository.updateApplication(id, { submittedAt }, tx)
    await completeOpenTasks({ caseId: application.caseId, applicationId: id, taskTypes: [TASK_TYPE.REVIEW_APPLICATION, TASK_TYPE.RECEIVE_HARD_COPY], db: tx })
    await createTask({ caseId: application.caseId, applicationId: id, title: 'Verify permit documents', description: `Verify the received documents for ${application.referenceNumber}.`, taskType: TASK_TYPE.VERIFY_DOCUMENTS, db: tx })
    await createTask({ caseId: application.caseId, applicationId: id, title: 'Evaluate permit application', description: `Evaluate ${application.referenceNumber} after receiving and reviewing the submitted documents.`, taskType: TASK_TYPE.EVALUATE_APPLICATION, db: tx })
  })
  return getApplication({ id })
}

const decide = async ({ id, actorId, decision, reason }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  if (workflow.currentStep.key !== STATUS.RECEIVING) throw new ConflictError('Application must be received before a receiving decision can be made.')
  const cleanReason = reason?.trim() || null
  if (decision === 'DECLINED' && !cleanReason) throw new ConflictError('A reason is required when declining an application.')
  const accepted = decision === 'ACCEPTED'
  const transitionKey = accepted ? 'ACCEPT_FOR_INSPECTION' : 'DECLINE'
  return repository.withTransaction(async (tx) => {
    if (accepted) await applicationDocumentService.validateRequiredDocuments({ applicationId: id, application, db: tx })
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    const nextWorkflow = await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey, actorId, metadata: { source: 'obo-receiving.decide', decision, reason: cleanReason, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    const updated = await repository.updateApplication(id, { acceptedAt: accepted ? new Date() : null, acceptedByUserId: accepted ? actorId : null, declinedAt: accepted ? null : new Date(), declineReason: accepted ? null : cleanReason }, tx)
    await repository.addDecision({ applicationId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    await completeOpenTasks({ caseId: application.caseId, applicationId: id, taskTypes: [TASK_TYPE.VERIFY_DOCUMENTS, TASK_TYPE.EVALUATE_APPLICATION], db: tx })
    return { ...updated, status: nextWorkflow.currentStep.key, workflowInstanceId: nextWorkflow.id }
  })
}

export { STATUS, TASK_TYPE, getApplication, getForAuthorization, listApplications, receiveHardcopy, decide, getWorkflowState }