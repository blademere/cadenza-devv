import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { requireAppId, withAppId } from '../../../platform/applications/application-scope.js'

const prisma = getPrismaClient()

const listActive = (appId, db = prisma) =>
  db.oboPermitType.findMany({
    where: withAppId({ isActive: true }, appId),
    orderBy: { name: 'asc' },
  })

const findActiveById = (id, appId, db = prisma) =>
  db.oboPermitType.findFirst({ where: withAppId({ id, isActive: true }, appId) })

const findById = (id, appId, db = prisma) =>
  db.oboPermitType.findFirst({ where: withAppId({ id }, appId) })

const findByKey = (key, appId, db = prisma) =>
  db.oboPermitType.findFirst({ where: withAppId({ key }, appId) })

const create = (data, db = prisma) => {
  const appId = requireAppId(data?.appId)
  return db.oboPermitType.create({ data: { ...data, appId } })
}

const update = async (id, appId, data, db = prisma) => {
  const result = await db.oboPermitType.updateMany({
    where: withAppId({ id }, appId),
    data,
  })
  if (!result.count) return null
  return db.oboPermitType.findFirst({
    where: withAppId({ id }, appId),
  })
}

const attachForm = async (id, appId, formId, db = prisma) => {
  const result = await db.oboPermitType.updateMany({
    where: withAppId({ id }, appId),
    data: { formId },
  })
  if (!result.count) return null
  return db.oboPermitType.findFirst({
    where: withAppId({ id }, appId),
  })
}

const withTransaction = (callback) => prisma.$transaction(callback)

export {
  listActive,
  findActiveById,
  findById,
  findByKey,
  create,
  update,
  attachForm,
  withTransaction,
}
