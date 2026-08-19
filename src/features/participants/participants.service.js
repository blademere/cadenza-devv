const { BadRequestError, ConflictError, NotFoundError } = require('../../common/errors/appError')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const {
  addParticipant,
  listParticipants,
  findParticipant,
  removeParticipant,
} = require('./participants.repository')

const prisma = getPrismaClient()

const ensureCaseAndPerson = async (caseId, personId) => {
  const [caseRecord, person] = await Promise.all([
    prisma.caseRecord.findUnique({ where: { id: caseId }, select: { id: true } }),
    prisma.person.findUnique({ where: { id: personId }, select: { id: true } }),
  ])
  if (!caseRecord) throw new NotFoundError('Case not found.')
  if (!person) throw new NotFoundError('Person not found.')
}

const add = async ({ caseId, personId, roleKey, isPrimary = false, metadata }) => {
  if (!caseId || !personId || !roleKey?.trim()) {
    throw new BadRequestError('caseId, personId, and roleKey are required.')
  }
  await ensureCaseAndPerson(caseId, personId)
  const existing = await findParticipant(caseId, personId, roleKey.trim())
  if (existing) throw new ConflictError('Participant is already assigned to this case role.')
  return addParticipant({ caseId, personId, roleKey: roleKey.trim(), isPrimary, metadata })
}

const list = async (caseId) => {
  const caseRecord = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { id: true } })
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listParticipants(caseId)
}

const remove = async (id) => {
  try {
    return await removeParticipant(id)
  } catch (error) {
    if (error?.code === 'P2025') throw new NotFoundError('Participant not found.')
    throw error
  }
}

module.exports = { add, list, remove }
