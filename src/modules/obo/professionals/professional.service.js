const { BadRequestError, ConflictError, NotFoundError } = require('../../../common/errors/appError')
const { publish } = require('../../../platform/event-bus/event-bus')
const repository = require('./professional.repository')

const applyForVerification = async ({ userId, registrationNumber }) => {
  if (!registrationNumber?.trim()) throw new BadRequestError('registrationNumber is required.')
  const person = await repository.findPersonByUserId(userId)
  if (!person) throw new ConflictError('The authenticated user does not have a person profile.')
  const existing = await repository.findByPersonId(person.id)
  if (existing) throw new ConflictError('A professional verification record already exists for this person.')
  return repository.create({ personId: person.id, userId, registrationNumber: registrationNumber.trim() })
}

const listPending = () => repository.listPending()
const listVerified = () => repository.listVerified()

const decideVerification = async ({ id, actorId, decision, reason }) => {
  const professional = await repository.findById(id)
  if (!professional) throw new NotFoundError('Professional registration not found.')
  if (professional.status !== 'PENDING_VERIFICATION') throw new ConflictError('Professional is not awaiting verification.')

  const accepted = decision === 'ACCEPTED'
  const cleanReason = reason?.trim() || null
  return repository.withTransaction(async (tx) => {
    const updated = await repository.update(id, { status: accepted ? 'VERIFIED' : 'DECLINED', verifiedByUserId: actorId, verifiedAt: new Date(), verificationReason: cleanReason }, tx)
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
        decision,
        reason: cleanReason,
        status: updated.status,
      },
      idempotencyKey: `obo:professional:${id}:verification:${updated.verifiedAt?.toISOString() || Date.now()}`,
    })
    return updated
  })
}

module.exports = { applyForVerification, listPending, listVerified, decideVerification }
