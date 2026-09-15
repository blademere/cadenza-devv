import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPersonById = (id, db = prisma) => db.person.findUnique({ where: { id }, select: { userId: true, email: true, isActive: true, user: { select: { email: true } } } })
const findById = (id, db = prisma) => db.oboProfessional.findUnique({ where: { id }, include: { person: { select: { id: true, isActive: true } } } })
const findByPersonId = (personId, db = prisma) => db.oboProfessional.findUnique({ where: { personId } })
const findByUserId = (userId, db = prisma) => db.oboProfessional.findUnique({ where: { userId }, include: { person: { select: { id: true, isActive: true } } } })
const create = (data, db = prisma) => db.oboProfessional.create({ data })
const listPending = (db = prisma) => db.oboProfessional.findMany({ where: { status: 'PENDING_VERIFICATION' }, include: { person: true }, orderBy: { createdAt: 'asc' } })

const professionalSelect = {
  id: true,
  registrationNumber: true,
  prcId: true,
  ptrNumber: true,
  professionalRole: true,
  status: true,
  verifiedAt: true,
  person: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      isActive: true,
    },
  },
}

const buildLookupWhere = ({ status = 'VERIFIED', role, search } = {}) => {
  const normalizedSearch = search?.trim()
  return {
    status,
    person: {
      isActive: true,
      ...(normalizedSearch
        ? {
            OR: [
              { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
              { middleName: { contains: normalizedSearch, mode: 'insensitive' } },
              { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
              { email: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    ...(role ? { professionalRole: role } : {}),
  }
}

const listVerified = (db = prisma) => db.oboProfessional.findMany({ where: { status: 'VERIFIED', person: { isActive: true } }, select: professionalSelect, orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }] })
const listLookup = ({ status = 'VERIFIED', role, search } = {}, db = prisma) => db.oboProfessional.findMany({ where: buildLookupWhere({ status, role, search }), select: professionalSelect, orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }], take: 50 })
const update = (id, data, db = prisma) => db.oboProfessional.update({ where: { id }, data })
const addDecision = (data, db = prisma) => db.oboProfessionalVerificationDecision.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

export { findPersonByUserId, findPersonById, findById, findByPersonId, findByUserId, create, listPending, listVerified, listLookup, update, addDecision, withTransaction }
