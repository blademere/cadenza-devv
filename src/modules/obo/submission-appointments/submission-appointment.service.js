const { ConflictError } = require('../../../common/errors/appError')
const appointmentService = require('../../../features/appointments/appointment.service')
const workflowService = require('../../../platform/workflow/workflow.service')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const planPermitService = require('../plan-permits/plan-permit.service')
const repository = require('../plan-permits/plan-permit.repository')

const prisma = getPrismaClient()

const getSubmissionAppointment = async ({ applicationId, userId }) => {
  const application = await planPermitService.getMine({ id: applicationId, userId })
  return application.submissionAppointment
}

const createSubmissionAppointment = async ({ applicationId, userId, appointmentTypeId, slotId, notes }) => {
  const application = await planPermitService.getMine({ id: applicationId, userId })
  if (application.status !== planPermitService.STATUS.READY_FOR_SUBMISSION) {
    throw new ConflictError('Application must be ready for submission before booking an appointment.')
  }
  if (application.submissionAppointment) {
    throw new ConflictError('A submission appointment is already assigned.')
  }

  return prisma.$transaction(async (tx) => {
    const appointment = await appointmentService.bookAppointment({
      userId,
      appointmentTypeId,
      slotId,
      metadata: { applicationId, purpose: 'OBO_HARDCOPY_SUBMISSION' },
      notes,
      db: tx,
    })

    await repository.createSubmissionAppointment({ applicationId, appointmentId: appointment.id }, tx)
    await workflowService.transitionWorkflow({
      instanceId: application.workflowInstanceId,
      transitionKey: 'SCHEDULE_SUBMISSION',
      actorId: userId,
      metadata: { source: 'obo-submission-appointments.create', appointmentId: appointment.id },
      db: tx,
    })

    return appointment
  })
}

module.exports = { getSubmissionAppointment, createSubmissionAppointment }
