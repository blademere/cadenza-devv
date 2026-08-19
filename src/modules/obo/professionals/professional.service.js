const { BadRequestError, ConflictError, NotFoundError } = require('../../../common/errors/appError')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')
const repository = require('./professional.repository')

const prisma = getPrismaClient()

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
  return prisma.$transaction(async (tx) => {
    const updated = await repository.update(id, {
      status: accepted ? 'VERIFIED' : 'DECLINED',
      verifiedByUserId: actorId,
      verifiedAt: new Date(),
      verificationReason: reason?.trim() || null,
    }, tx)
    await repository.addDecision({ professionalId: id, decision, reason: reason?.trim() || null, decidedByUserId: actorId }, tx)
    return updated
  })
}

module.exports = { applyForVerification, listPending, listVerified, decideVerification }
