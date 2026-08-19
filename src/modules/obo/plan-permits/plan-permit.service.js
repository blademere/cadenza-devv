const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const appointmentService = require('../../../features/appointments/appointment.service')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const repository = require('./plan-permit.repository')

const prisma = getPrismaClient()
const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  READY_FOR_SUBMISSION: 'READY_FOR_SUBMISSION',
  SUBMISSION_SCHEDULED: 'SUBMISSION_SCHEDULED',
})

const getClientPerson = async (userId) => {
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  return person
}

const createApplication = async ({ userId, permitTypeId, professionalId, formVersionId, formValues }) => {
  const person = await getClientPerson(userId)
  const professional = await repository.findProfessional(professionalId)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== 'VERIFIED') throw new ConflictError('The selected professional is not verified.')
  const result = await repository.create({ clientPersonId: person.id, permitTypeId, professionalId, formVersionId, formValues, userId })
  if (!result) throw new NotFoundError('Active permit type not found.')
  if (result.notFound === 'professional') throw new NotFoundError('Professional registration not found.')
  return result
}

const getMine = async ({ id, userId }) => {
  const person = await getClientPerson(userId)
  const application = await repository.findOwnedByClient(id, person.id)
  if (!application) throw new NotFoundError('Permit application not found.')
  return application
}

const listMine = async ({ userId }) => repository.listByClient((await getClientPerson(userId)).id)

const submit = async ({ id, userId }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.DRAFT) throw new ConflictError('Only draft applications can be submitted.')
  return repository.update(id, { status: STATUS.READY_FOR_SUBMISSION })
}

const bookSubmissionAppointment = async ({ id, userId, appointmentTypeId, slotId, notes }) => {
  const application = await getMine({ id, userId })
  if (application.status !== STATUS.READY_FOR_SUBMISSION) throw new ConflictError('Application must be ready for submission before booking an appointment.')
  if (application.submissionAppointment) throw new ConflictError('A submission appointment is already assigned.')

  const appointment = await appointmentService.bookAppointment({
    userId,
    appointmentTypeId,
    slotId,
    metadata: { applicationId: id, purpose: 'OBO_HARDCOPY_SUBMISSION' },
    notes,
  })

  return prisma.$transaction(async (tx) => {
    await repository.createSubmissionAppointment({ applicationId: id, appointmentId: appointment.id }, tx)
    return repository.update(id, { status: STATUS.SUBMISSION_SCHEDULED }, tx)
  })
}

module.exports = { createApplication, getMine, listMine, submit, bookSubmissionAppointment }
