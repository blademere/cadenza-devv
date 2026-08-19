const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const repository = require('./receiving.repository')

const prisma = getPrismaClient()

const listApplications = ({ status }) => repository.listApplications(status)

const decide = async ({ id, actorId, decision, reason }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  if (application.status !== 'SUBMISSION_SCHEDULED') {
    throw new ConflictError('Application is not awaiting hardcopy receiving.')
  }
  if (application.professional.status !== 'VERIFIED') {
    throw new ConflictError('The associated professional is not verified.')
  }
  if (!application.submissionAppointment) {
    throw new ConflictError('A hardcopy submission appointment is required.')
  }

  const appointment = await repository.findSubmissionAppointment(application.submissionAppointment.appointmentId)
  if (!appointment) throw new ConflictError('The submission appointment no longer exists.')
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
    throw new ConflictError('The submission appointment is not valid for receiving.')
  }
  if (appointment.slot.startsAt > new Date()) {
    throw new ConflictError('The hardcopy submission appointment has not started yet.')
  }

  const accepted = decision === 'ACCEPTED'
  const cleanReason = reason?.trim() || null

  return prisma.$transaction(async (tx) => {
    const updated = await repository.updateApplication(id, {
      status: accepted ? 'FOR_INSPECTION' : 'DECLINED',
      submittedAt: application.submittedAt || new Date(),
      acceptedAt: accepted ? new Date() : null,
      acceptedByUserId: accepted ? actorId : null,
      declinedAt: accepted ? null : new Date(),
      declineReason: accepted ? null : cleanReason || 'Application declined by receiving officer.',
    }, tx)

    await repository.addDecision({
      applicationId: id,
      decision,
      reason: cleanReason,
      decidedByUserId: actorId,
    }, tx)

    return updated
  })
}

module.exports = { listApplications, decide }
