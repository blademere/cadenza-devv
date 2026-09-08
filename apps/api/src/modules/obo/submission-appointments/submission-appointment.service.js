import { ConflictError } from '../../../common/errors/appError.js'
import * as appointmentService from '../../../features/appointments/appointment.service.js'
import { mapAppointment } from '../../../features/appointments/appointment.mapper.js'
import * as workflowService from '../../../platform/workflow/workflow.service.js'
import * as planPermitService from '../plan-permits/plan-permit.service.js'
import * as repository from '../plan-permits/plan-permit.repository.js'
import { getNotificationContext } from '../notification-context.js'

const getSubmissionAppointment = async ({ applicationId, userId }) => {
  const application = await planPermitService.getMine({ id: applicationId, userId })
  const submissionAppointment = application.submissionAppointment
  if (!submissionAppointment) return null

  const appointment = await appointmentService.getMyAppointment({
    id: submissionAppointment.appointmentId,
    userId,
  })
  return mapAppointment(appointment)
}

const createSubmissionAppointment = async ({ applicationId, userId, appointmentTypeId, slotId, notes }) => {
  const application = await planPermitService.getMine({ id: applicationId, userId })
  if (application.status !== planPermitService.STATUS.READY_FOR_SUBMISSION) throw new ConflictError('Application must be ready for submission before booking an appointment.')
  if (application.submissionAppointment) throw new ConflictError('A submission appointment is already assigned.')

  return repository.withTransaction(async (tx) => {
    const appointment = await appointmentService.bookAppointment({
      userId,
      appointmentTypeId,
      slotId,
      metadata: { applicationId, purpose: 'OBO_HARDCOPY_SUBMISSION' },
      notes,
      db: tx,
    })

    await repository.createSubmissionAppointment({ applicationId, appointmentId: appointment.id }, tx)
    const notificationContext = await getNotificationContext({
      personId: application.clientPersonId,
      db: tx,
      findPersonNotificationContext: repository.findPersonNotificationContext,
    })

    await workflowService.transitionWorkflow({
      instanceId: application.workflowInstanceId,
      transitionKey: 'SCHEDULE_SUBMISSION',
      actorId: userId,
      metadata: {
        source: 'obo-submission-appointments.create',
        appointmentId: appointment.id,
        referenceNumber: application.referenceNumber,
        permitTypeName: application.permitType.name,
        appointmentStartsAt: appointment.slot?.startsAt || null,
        ...notificationContext,
      },
      db: tx,
    })

    return mapAppointment(appointment)
  })
}

export { getSubmissionAppointment, createSubmissionAppointment }
