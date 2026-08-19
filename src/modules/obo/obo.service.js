const { BadRequestError, ConflictError, NotFoundError } = require('../../common/errors/appError')
const appointmentService = require('../../features/appointments/appointment.service')
const repository = require('./obo.repository')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const { OBO_APPLICATION_STATUS, OBO_PROFESSIONAL_STATUS } = require('./obo.constants')
const prisma = getPrismaClient()
const listPermitTypes = () => repository.listPermitTypes()
const createProfessional = async ({ personId, userId, registrationNumber }) => {
  if (!personId || !registrationNumber?.trim()) throw new BadRequestError('personId and registrationNumber are required.')
  return repository.createProfessional({ personId, userId, registrationNumber: registrationNumber.trim() })
}
const listPendingProfessionals = () => repository.listPendingProfessionals()
const verifyProfessional = async ({ id, actorId, decision, reason }) => {
  const professional = await repository.findProfessional(id)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== OBO_PROFESSIONAL_STATUS.PENDING_VERIFICATION) throw new ConflictError('Professional is not awaiting verification.')
  return prisma.$transaction(async (tx) => {
    const accepted = decision === 'ACCEPTED'
    const updated = await repository.updateProfessional(id, { status: accepted ? OBO_PROFESSIONAL_STATUS.VERIFIED : OBO_PROFESSIONAL_STATUS.DECLINED, verifiedByUserId: actorId, verifiedAt: new Date(), verificationReason: reason?.trim() || null }, tx)
    await repository.addProfessionalDecision({ professionalId: id, decision, reason: reason?.trim() || null, decidedByUserId: actorId }, tx)
    return updated
  })
}
const createApplication = async ({ userId, permitTypeId, professionalId, formVersionId, formValues }) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  const professional = await repository.findProfessional(professionalId)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== OBO_PROFESSIONAL_STATUS.VERIFIED) throw new ConflictError('The selected professional is not verified.')
  const result = await repository.createApplication({ clientPersonId: person.id, permitTypeId, professionalId, formVersionId, formValues, userId })
  if (!result) throw new NotFoundError('Active permit type not found.')
  if (result.notFound === 'professional') throw new NotFoundError('Professional registration not found.')
  return result
}
const getApplication = async ({ id, userId }) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  const application = await repository.findApplication(id)
  if (!application || application.clientPersonId !== person.id) throw new NotFoundError('Permit application not found.')
  return application
}
const listMine = async ({ userId }) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  return repository.listApplicationsByClient(person.id)
}
const listReceivingApplications = ({ status }) => repository.listReceivingApplications(status)
const submitApplication = async ({ id, userId }) => {
  const application = await getApplication({ id, userId })
  if (application.status !== OBO_APPLICATION_STATUS.DRAFT) throw new ConflictError('Only draft applications can be submitted.')
  return repository.updateApplication(id, { status: OBO_APPLICATION_STATUS.READY_FOR_SUBMISSION })
}
const bookSubmissionAppointment = async ({ id, userId, appointmentTypeId, slotId, notes }) => {
  const application = await getApplication({ id, userId })
  if (application.status !== OBO_APPLICATION_STATUS.READY_FOR_SUBMISSION) throw new ConflictError('Application must be ready for submission before booking an appointment.')
  if (application.submissionAppointment) throw new ConflictError('A submission appointment is already assigned.')
  const appointment = await appointmentService.bookAppointment({ userId, appointmentTypeId, slotId, metadata: { applicationId: id, purpose: 'OBO_HARDCOPY_SUBMISSION' }, notes })
  return prisma.$transaction(async (tx) => {
    await tx.oboSubmissionAppointment.create({ data: { applicationId: id, appointmentId: appointment.id } })
    return repository.updateApplication(id, { status: OBO_APPLICATION_STATUS.SUBMISSION_SCHEDULED }, tx)
  })
}
const receiveApplication = async ({ id, actorId, decision, reason }) => {
  const application = await repository.findApplication(id)
  if (!application) throw new NotFoundError('Permit application not found.')
  if (![OBO_APPLICATION_STATUS.SUBMISSION_SCHEDULED, OBO_APPLICATION_STATUS.SUBMITTED, OBO_APPLICATION_STATUS.FOR_RECEIVING_REVIEW].includes(application.status)) throw new ConflictError('Application is not ready for receiving review.')
  if (application.professional.status !== OBO_PROFESSIONAL_STATUS.VERIFIED) throw new ConflictError('The associated professional is not verified.')
  return prisma.$transaction(async (tx) => {
    const accepted = decision === 'ACCEPTED'
    const updated = await repository.updateApplication(id, { status: accepted ? OBO_APPLICATION_STATUS.FOR_INSPECTION : OBO_APPLICATION_STATUS.DECLINED, acceptedAt: accepted ? new Date() : null, acceptedByUserId: accepted ? actorId : null, declinedAt: accepted ? null : new Date(), declineReason: accepted ? null : reason?.trim() || 'Application declined by receiving officer.', submittedAt: application.submittedAt || new Date() }, tx)
    await repository.addReceivingDecision({ applicationId: id, decision, reason: reason?.trim() || null, decidedByUserId: actorId }, tx)
    return updated
  })
}
module.exports = { listPermitTypes, createProfessional, listPendingProfessionals, verifyProfessional, createApplication, getApplication, listMine, listReceivingApplications, submitApplication, bookSubmissionAppointment, receiveApplication }
