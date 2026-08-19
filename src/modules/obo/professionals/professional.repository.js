const { getPrismaClient } = require('../../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findById = (id, db = prisma) => db.oboProfessional.findUnique({ where: { id } })
const findByPersonId = (personId, db = prisma) => db.oboProfessional.findUnique({ where: { personId } })
const create = (data, db = prisma) => db.oboProfessional.create({ data })
const listPending = (db = prisma) => db.oboProfessional.findMany({
  where: { status: 'PENDING_VERIFICATION' },
  include: { person: true },
  orderBy: { createdAt: 'asc' },
})
const listVerified = (db = prisma) => db.oboProfessional.findMany({
  where: { status: 'VERIFIED', person: { isActive: true } },
  select: {
    id: true,
    registrationNumber: true,
    status: true,
    verifiedAt: true,
    person: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true } },
  },
  orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
})
const update = (id, data, db = prisma) => db.oboProfessional.update({ where: { id }, data })
const addDecision = (data, db = prisma) => db.oboProfessionalVerificationDecision.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

module.exports = {
  findPersonByUserId,
  findById,
  findByPersonId,
  create,
  listPending,
  listVerified,
  update,
  addDecision,
  withTransaction,
}
