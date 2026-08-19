const { ConflictError, NotFoundError } = require('../../../common/errors/appError')
const appointmentService = require('../../../features/appointments/appointment.service')
const formService = require('../../../platform/forms/form.service')
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

const resolveAndValidateForm = async ({ permitType, formVersionId, formValues }) => {
  if (!permitType.formId) return { formVersionId: formVersionId || null }

  const form = await repository.findFormById(permitType.formId)
  if (!form || !form.isActive) throw new ConflictError('The permit type is linked to an inactive form.')

  if (formVersionId) {
    const version = await repository.findFormVersionById(formVersionId)
    if (!version || version.formId !== form.id || version.status !== 'PUBLISHED') {
      throw new ConflictError('The selected form version is not the published version for this permit type.')
    }
    const validation = await formService.validateFormValues({ formKey: form.key, version: version.version, values: formValues })
    if (!validation.valid) throw new ConflictError('Permit form validation failed.')
    return { formVersionId: version.id }
  }

  const validation = await formService.validateFormValues({ formKey: form.key, values: formValues })
  if (!validation.valid) throw new ConflictError('Permit form validation failed.')
  return { formVersionId: validation.formVersionId }
}

const createApplication = async ({ userId, permitTypeId, professionalId, formVersionId, formValues }) => {
  const person = await getClientPerson(userId)
  const permitType = await repository.findPermitType(permitTypeId)
  if (!permitType) throw new NotFoundError('Active permit type not found.')
  const professional = await repository.findProfessional(professionalId)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== 'VERIFIED') throw new ConflictError('The selected professional is not verified.')

  const resolvedForm = await resolveAndValidateForm({ permitType, formVersionId, formValues })
  return repository.create({
    clientPersonId: person.id,
    permitTypeId,
    professionalId,
    formVersionId: resolvedForm.formVersionId,
    formValues,
    userId,
  })
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
