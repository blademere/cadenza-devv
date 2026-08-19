const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const repository = require('./receiving.repository')

const prisma = getPrismaClient()
const STATUS = Object.freeze({ SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED', RECEIVING: 'RECEIVING', DECLINED: 'DECLINED', FOR_INSPECTION: 'FOR_INSPECTION' })

const listApplications = ({ status }) => repository.listApplications(status)

const receiveHardcopy = async ({ id }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  if (application.status !== STATUS.SUBMISSION_SCHEDULED) throw new ConflictError('Only scheduled applications can be received.')
  if (!application.submissionAppointment) throw new ConflictError('A hardcopy submission appointment is required.')
  const appointment = await repository.findSubmissionAppointment(application.submissionAppointment.appointmentId)
  if (!appointment) throw new ConflictError('The submission appointment no longer exists.')
  if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') throw new ConflictError('The submission appointment is not valid for receiving.')
  if (appointment.slot.startsAt > new Date()) throw new ConflictError('The hardcopy submission appointment has not started yet.')
  if (application.professional.status !== 'VERIFIED') throw new ConflictError('The associated professional is not verified.')
  return repository.updateApplication(id, { status: STATUS.RECEIVING, submittedAt: application.submittedAt || new Date() })
}

const decide = async ({ id, actorId, decision, reason }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  if (application.status !== STATUS.RECEIVING) throw new ConflictError('Application must be received before a receiving decision can be made.')
  const cleanReason = reason?.trim() || null
  if (decision === 'DECLINED' && !cleanReason) throw new ConflictError('A reason is required when declining an application.')
  const accepted = decision === 'ACCEPTED'
  return prisma.$transaction(async (tx) => {
    const updated = await repository.updateApplication(id, {
      status: accepted ? STATUS.FOR_INSPECTION : STATUS.DECLINED,
      acceptedAt: accepted ? new Date() : null,
      acceptedByUserId: accepted ? actorId : null,
      declinedAt: accepted ? null : new Date(),
      declineReason: accepted ? null : cleanReason,
    }, tx)
    await repository.addDecision({ applicationId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    return updated
  })
}

module.exports = { STATUS, listApplications, receiveHardcopy, decide }
