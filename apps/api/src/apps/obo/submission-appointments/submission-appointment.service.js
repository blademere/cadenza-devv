import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import { mapAppointment } from '../../../features/appointments/appointment.mapper.js'
import * as taskService from '../../../features/tasks/tasks.service.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import { publish } from '../../../platform/event-bus/event-bus.js'
import * as applicationService from '../applications/applications.service.js'
import * as repository from './submission-appointment.repository.js'
import { getNotificationContext } from '../notification-context.js'

const TASK_TYPE = Object.freeze({ RECEIVE_HARD_COPY: 'RECEIVE_HARD_COPY' })

const getSubmissionAppointment = async ({ applicationId, appId, userId }) => {
  const application = await applicationService.getMine({ id: applicationId, appId, userId })
  const submissionAppointment = application.submissionAppointment
  if (!submissionAppointment) return null
  const appointment = await appointmentService.getMyAppointment({ id: submissionAppointment.appointmentId, userId, appId })
  return mapAppointment(appointment)
}

const createSubmissionAppointment = async ({ applicationId, appId, userId, appointmentTypeId, slotId, notes }) => {
  const application = await applicationService.getMine({ id: applicationId, appId, userId })
  if (application.status !== applicationService.STATUS.READY_FOR_SUBMISSION) throw new ConflictError('Application must be ready for submission before booking an appointment.')
  if (application.submissionAppointment) throw new ConflictError('A submission appointment is already assigned.')

  return repository.withTransaction(async (tx) => {
    const appointment = await appointmentService.bookAppointment({ userId, appId, appointmentTypeId, slotId, metadata: { applicationId, purpose: 'OBO_HARDCOPY_SUBMISSION' }, notes, db: tx })
    await repository.createSubmissionAppointment({ applicationId, appointmentId: appointment.id }, tx)
    const notificationContext = await getNotificationContext({ personId: application.clientPersonId, db: tx, findPersonNotificationContext: repository.findPersonNotificationContext })
    await workflowService.transitionWorkflow({ instanceId: application.workflowInstanceId, transitionKey: 'SCHEDULE_SUBMISSION', actorId: userId, metadata: { source: 'obo-submission-appointments.create', appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeName: application.permitType.name, ...notificationContext }, db: tx })
    await taskService.create({ caseId: application.caseId, title: 'Receive hard-copy documents', description: `Receive the hard-copy documents for ${application.referenceNumber} at the scheduled appointment.`, status: 'OPEN', priority: 'HIGH', dueAt: appointment.slot?.startsAt || null, metadata: { source: 'obo-submission-appointments', taskType: TASK_TYPE.RECEIVE_HARD_COPY, applicationId, workflowTransition: 'SCHEDULE_SUBMISSION', appointmentId: appointment.id } }, { appId, db: tx })
    await publish({ db: tx, event: 'obo.permit_application.appointment.booked', entityType: 'OboPermitApplication', entityId: applicationId, actorId: userId, context: { appId, caseId: application.caseId, appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeId: application.permitTypeId, appointmentTypeId, slotId, startsAt: appointment.slot?.startsAt || null, endsAt: appointment.slot?.endsAt || null, purpose: 'OBO_HARDCOPY_SUBMISSION' }, idempotencyKey: `obo:permit-application:${applicationId}:appointment:booked:${appointment.id}` })
    return mapAppointment(appointment)
  })
}

const replaceSubmissionAppointment = async ({ applicationId, appId, userId, appointmentTypeId, slotId, notes }) => {
  const application = await applicationService.getMine({ id: applicationId, appId, userId })
  if (application.status !== 'SUBMISSION_SCHEDULED') throw new ConflictError('Only scheduled applications can change their submission appointment.')
  if (!application.submissionAppointment) throw new NotFoundError('Submission appointment not found.')

  return repository.withTransaction(async (tx) => {
    const previousAppointmentId = application.submissionAppointment.appointmentId
    await appointmentService.cancelAppointment({ id: previousAppointmentId, userId, appId, db: tx })
    const appointment = await appointmentService.bookAppointment({ userId, appId, appointmentTypeId, slotId, metadata: { applicationId, purpose: 'OBO_HARDCOPY_SUBMISSION' }, notes, db: tx })
    await repository.updateSubmissionAppointment(applicationId, appointment.id, tx)
    const tasks = await taskService.list({ caseId: application.caseId, status: 'OPEN' }, { appId, db: tx })
    const receivingTask = tasks.find((task) => {
      const metadata = task.metadata || {}
      return metadata.applicationId === applicationId && metadata.taskType === TASK_TYPE.RECEIVE_HARD_COPY
    })
    if (receivingTask) await taskService.update(receivingTask.id, { dueAt: appointment.slot?.startsAt || null, metadata: { ...(receivingTask.metadata || {}), appointmentId: appointment.id } }, { appId, db: tx })
    await publish({ db: tx, event: 'obo.permit_application.appointment.rescheduled', entityType: 'OboPermitApplication', entityId: applicationId, actorId: userId, context: { appId, caseId: application.caseId, previousAppointmentId, appointmentId: appointment.id, referenceNumber: application.referenceNumber, permitTypeId: application.permitTypeId, appointmentTypeId, slotId, startsAt: appointment.slot?.startsAt || null, endsAt: appointment.slot?.endsAt || null, purpose: 'OBO_HARDCOPY_SUBMISSION' }, idempotencyKey: `obo:permit-application:${applicationId}:appointment:rescheduled:${previousAppointmentId}:${appointment.id}` })
    return mapAppointment(appointment)
  })
}

export { getSubmissionAppointment, createSubmissionAppointment, replaceSubmissionAppointment }
