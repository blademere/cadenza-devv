import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import * as taskService from '../../../features/tasks/tasks.service.js'
import * as repository from './receiving.repository.js'
import * as applicationDocumentService from '../application-documents/application-document.service.js'
import { getNotificationContext } from '../notification-context.js'
import { hasReceivingTaskAccess } from './receiving.authorization.js'

const STATUS = Object.freeze({ SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })
const TASK_TYPE = Object.freeze({ REVIEW_APPLICATION: 'REVIEW_APPLICATION', RECEIVE_HARD_COPY: 'RECEIVE_HARD_COPY', VERIFY_DOCUMENTS: 'VERIFY_DOCUMENTS', EVALUATE_APPLICATION: 'EVALUATE_APPLICATION' })
const getWorkflowState = async (application) => {
  if (!application.workflowInstanceId) throw new ConflictError('Permit application is not attached to a workflow instance.')
  try { return await workflowService.getWorkflowInstance(application.workflowInstanceId) } catch (error) { if (error?.code === 'NOT_FOUND' || error?.status === 404) throw new ConflictError('Permit application workflow instance was not found.'); throw error }
}
const hydrateApplication = async (application, appId, db) => {
  if (!application || !application.submissionAppointment?.appointmentId) return application
  const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId, appId, db })
  return { ...application, submissionAppointment: { ...application.submissionAppointment, appointment } }
}
const getApplication = async ({ id, appId }) => {
  const application = await repository.findApplication(id, appId)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  return hydrateApplication({ ...application, status: workflow.currentStep.key }, appId)
}
const getForAuthorization = (id, appId) => repository.findApplication(id, appId)
const listApplications = async ({ status, userId, appId }) => {
  const applications = await repository.listApplications(appId)
  const hydrated = await Promise.all(applications.map(async (application) => {
    const workflow = await getWorkflowState(application)
    if (status && workflow.currentStep.key !== status) return null
    if (!status && workflow.currentStep.key !== STATUS.SUBMISSION_SCHEDULED) return null
    if (userId && !(await hasReceivingTaskAccess({ user: { id: userId }, resource: application }))) return null
    return hydrateApplication({ ...application, status: workflow.currentStep.key }, appId)
  }))
  return hydrated.filter(Boolean)
}
const completeOpenTasks = async ({ caseId, applicationId, taskTypes, appId, db }) => {
  const tasks = await taskService.list({ caseId, status: 'OPEN' }, { appId, db })
  for (const task of tasks) {
    const metadata = task.metadata || {}
    if (metadata.applicationId !== applicationId || !taskTypes.includes(metadata.taskType)) continue
    await taskService.update(task.id, { status: 'DONE', completedAt: new Date() }, { appId, db })
  }
}
const createTask = ({ caseId, applicationId, title, description, taskType, appId, dueAt = null, db }) => taskService.create({ caseId, title, description, status: 'OPEN', priority: 'HIGH', dueAt, metadata: { source: 'obo-receiving', taskType, applicationId } }, { appId, db })

const receiveHardcopy = async ({ id, appId, actorId }) => {
  const application = await repository.findApplication(id, appId)
  if (!application) throw new NotFoundError('Permit application not found.')
  const workflow = await getWorkflowState(application)
  if (workflow.currentStep.key !== STATUS.SUBMISSION_SCHEDULED) throw new ConflictError('Only scheduled applications can be received.')
  if (!application.submissionAppointment) throw new ConflictError('A hardcopy submission appointment is required.')
  const appointment = await appointmentService.getAppointmentForReference({ id: application.submissionAppointment.appointmentId, appId })
  if (!appointment) throw new ConflictError('The submission appointment no longer exists.')
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') throw new ConflictError('The submission appointment is not valid for receiving.')
  if (appointment.slot.startsAt > new Date()) throw new ConflictError('The hardcopy submission appointment has not started yet.')
  const submittedAt = application.submittedAt || new Date()
  await repository.withTransaction(async (tx) => {
    await applicationDocumentService.ensureChecklist(application, tx)
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'RECEIVE_HARDCOPY', actorId, metadata: { source: 'obo-receiving.receive', appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    await repository.updateApplication(id, appId, { submittedAt }, tx)
    await completeOpenTasks({ caseId: application.caseId, applicationId: id, taskTypes: [TASK_TYPE.REVIEW_APPLICATION, TASK_TYPE.RECEIVE_HARD_COPY], appId, db: tx })
    await createTask({ caseId: application.caseId, applicationId: id, title: 'Verify permit documents', description: `Verify the received documents for ${application.referenceNumber}.`, taskType: TASK_TYPE.VERIFY_DOCUMENTS, appId, db: tx })
    await createTask({ caseId: application.caseId, applicationId: id, title: 'Evaluate permit application', description: `Evaluate ${application.referenceNumber} after receiving and reviewing the submitted documents.`, taskType: TASK_TYPE.EVALUATE_APPLICATION, appId, db: tx })
    await publish({ db: tx, event: 'obo.permit_application.hardcopy.received', entityType: 'OboPermitApplication', entityId: id, actorId, context: { appId, caseId: application.caseId, appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeId: application.permitTypeId, submittedAt, workflowTransition: 'RECEIVE_HARDCOPY' }, idempotencyKey: `obo:permit-application:${id}:hardcopy-received:${submittedAt.toISOString()}` })
  })
  return getApplication({ id, appId })
}

const decide = async ({ id, appId, actorId, decision, reason }) => {
  const application = await repository.findApplication(id, appId)
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
    const updated = await repository.updateApplication(id, appId, { acceptedAt: accepted ? new Date() : null, acceptedByUserId: accepted ? actorId : null, declinedAt: accepted ? null : new Date(), declineReason: accepted ? null : cleanReason }, tx)
    if (!updated) throw new NotFoundError('Permit application not found.')
    await repository.addDecision({ applicationId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    await completeOpenTasks({ caseId: application.caseId, applicationId: id, taskTypes: [TASK_TYPE.VERIFY_DOCUMENTS, TASK_TYPE.EVALUATE_APPLICATION], appId, db: tx })
    await publish({ db: tx, event: accepted ? 'obo.permit_application.accepted' : 'obo.permit_application.declined', entityType: 'OboPermitApplication', entityId: id, actorId, context: { appId, caseId: application.caseId, referenceNumber: application.referenceNumber, permitTypeId: application.permitTypeId, permitTypeName: application.permitType.name, decision, reason: cleanReason, workflowTransition: transitionKey, nextStatus: nextWorkflow.currentStep.key }, idempotencyKey: `obo:permit-application:${id}:decision:${nextWorkflow.currentStep.key}` })
    return { ...updated, status: nextWorkflow.currentStep.key, workflowInstanceId: nextWorkflow.id }
  })
}

export { STATUS, TASK_TYPE, getApplication, getForAuthorization, listApplications, receiveHardcopy, decide, getWorkflowState }