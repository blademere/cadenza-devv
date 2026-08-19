const { NotFoundError, ConflictError } = require('../../../../common/errors')
const appointmentService = require('../../../../features/appointments/appointment.service')
const applicationRepository = require('../plan-permit.repository')

const ensureApplicationAccess = async (applicationId, userId) => {
  const application = await applicationRepository.findById(applicationId)
  if (!application) throw new NotFoundError('Permit application not found')

  if (application.client?.userId && application.client.userId !== userId) {
    throw new ConflictError('You do not have access to this permit application')
  }

  return application
}

const createSubmissionAppointment = async ({ applicationId, userId, input }) => {
  await ensureApplicationAccess(applicationId, userId)

  return appointmentService.createAppointment({
    userId,
    appointmentTypeId: input.appointmentTypeId,
    slotId: input.slotId,
  })
}

const listSubmissionAppointments = async ({ applicationId, userId }) => {
  await ensureApplicationAccess(applicationId, userId)
  return appointmentService.listMyAppointments({ userId })
}

const cancelSubmissionAppointment = async ({ applicationId, appointmentId, userId }) => {
  await ensureApplicationAccess(applicationId, userId)
  return appointmentService.cancelAppointment({ appointmentId, userId })
}

module.exports = {
  createSubmissionAppointment,
  listSubmissionAppointments,
  cancelSubmissionAppointment,
}
