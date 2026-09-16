import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { requireAppId, withAppId } from '../../../platform/applications/application-scope.js'

const prisma = getPrismaClient()

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPersonById = (id, db = prisma) => db.person.findUnique({ where: { id }, select: { userId: true, email: true, isActive: true, user: { select: { email: true } } } })
const findById = (id, appId, db = prisma) => db.oboProfessional.findFirst({ where: withAppId({ id }, appId), include: { person: { select: { id: true, isActive: true, userId: true } } } })
const findByPersonId = (personId, appId, db = prisma) => db.oboProfessional.findFirst({ where: withAppId({ personId }, appId) })
const create = (data, db = prisma) => {
  const appId = requireAppId(data?.appId)
  return db.oboProfessional.create({ data: { ...data, appId } })
}
const listPending = (appId, db = prisma) => db.oboProfessional.findMany({ where: withAppId({ status: 'PENDING_VERIFICATION' }, appId), include: { person: true }, orderBy: { createdAt: 'asc' } })

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

const buildLookupWhere = ({ appId, status = 'VERIFIED', role, search } = {}) => {
  const normalizedSearch = search?.trim()
  return {
    appId: requireAppId(appId),
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

const listVerified = (appId, db = prisma) => db.oboProfessional.findMany({ where: withAppId({ status: 'VERIFIED', person: { isActive: true } }, appId), select: professionalSelect, orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }] })
const listLookup = ({ appId, status = 'VERIFIED', role, search } = {}, db = prisma) => db.oboProfessional.findMany({ where: buildLookupWhere({ appId, status, role, search }), select: professionalSelect, orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }], take: 50 })
const update = async (id, appId, data, db = prisma) => {
  const result = await db.oboProfessional.updateMany({ where: withAppId({ id }, appId), data })
  if (!result.count) return null
  return db.oboProfessional.findUnique({ where: { id } })
}
const addDecision = (data, db = prisma) => db.oboProfessionalVerificationDecision.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

export { findPersonByUserId, findPersonById, findById, findByPersonId, create, listPending, listVerified, listLookup, update, addDecision, withTransaction }
