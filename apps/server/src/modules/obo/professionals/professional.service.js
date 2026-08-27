const { BadRequestError, ConflictError, NotFoundError } = require('../../../common/errors/appError')
const { publish } = require('../../../platform/event-bus/event-bus')
const peopleService = require('../../../features/people/people.service')
const repository = require('./professional.repository')

const normalizeCredential = (value) => value?.trim() || ''

const getProfile = async ({ userId }) => {
  return peopleService.getByUserId(userId)
}

const updateProfile = async ({ userId, ...data }) => {
  const existing = await repository.findPersonByUserId(userId)
  if (existing) return peopleService.update(existing.id, data)
  return peopleService.create({ ...data, userId })
}

const applyForVerification = async ({ userId, registrationNumber, prcId, ptrNumber }) => {
  const normalizedRegistrationNumber = normalizeCredential(registrationNumber)
  const normalizedPrcId = normalizeCredential(prcId)
  const normalizedPtrNumber = normalizeCredential(ptrNumber)
  if (!normalizedRegistrationNumber) throw new BadRequestError('registrationNumber is required.')
  if (!normalizedPrcId) throw new BadRequestError('prcId is required.')
  if (!normalizedPtrNumber) throw new BadRequestError('ptrNumber is required.')

  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('Complete your person profile before applying for professional verification.')
  const existing = await repository.findByPersonId(person.id)
  if (existing) throw new ConflictError('A professional verification record already exists for this person.')

  return repository.create({
    personId: person.id,
    userId,
    registrationNumber: normalizedRegistrationNumber,
    prcId: normalizedPrcId,
    ptrNumber: normalizedPtrNumber,
  })
}

const getMine = async ({ userId }) => {
  const professional = await repository.findByUserId(userId)
  if (!professional) throw new NotFoundError('Professional verification record not found.')
  return professional
}
const listPending = () => repository.listPending()
const listVerified = () => repository.listVerified()

const decideVerification = async ({ id, actorId, decision, reason }) => {
  const professional = await repository.findById(id)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== 'PENDING_VERIFICATION') throw new ConflictError('Professional is not awaiting verification.')

  if (Number(professional.userId) === Number(actorId)) {
    throw new ConflictError('A professional cannot approve or decline their own verification.')
  }

  const accepted = decision === 'ACCEPTED'
  const cleanReason = reason?.trim() || null
  if (!accepted && !cleanReason) throw new BadRequestError('A reason is required when declining a professional verification application.')

  return repository.withTransaction(async (tx) => {
    const updated = await repository.update(id, {
      status: accepted ? 'VERIFIED' : 'DECLINED',
      verifiedByUserId: actorId,
      verifiedAt: new Date(),
      verificationReason: cleanReason,
    }, tx)
    await repository.addDecision({ professionalId: id, decision, reason: cleanReason, decidedByUserId: actorId }, tx)
    const person = await repository.findPersonById(professional.personId, tx)
    await publish({
      db: tx,
      event: 'obo.professional.verification.decided',
      entityType: 'OboProfessional',
      entityId: id,
      actorId,
      context: {
        professionalUserId: person?.userId || professional.userId || null,
        professionalEmail: person?.user?.email || person?.email || null,
        registrationNumber: professional.registrationNumber,
        prcId: professional.prcId,
        ptrNumber: professional.ptrNumber,
        decision,
        reason: cleanReason,
        status: updated.status,
      },
      idempotencyKey: `obo:professional:${id}:verification:${updated.verifiedAt?.toISOString() || Date.now()}`,
    })
    return updated
  })
}

module.exports = { getProfile, updateProfile, applyForVerification, getMine, listPending, listVerified, decideVerification }
