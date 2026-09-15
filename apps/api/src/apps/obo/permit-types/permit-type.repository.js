import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listActive = (db = prisma) =>
  db.oboPermitType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })

const findActiveById = (id, db = prisma) =>
  db.oboPermitType.findFirst({ where: { id, isActive: true } })

const findById = (id, db = prisma) => db.oboPermitType.findUnique({ where: { id } })
const findByKey = (key, db = prisma) => db.oboPermitType.findUnique({ where: { key } })
const create = (data, db = prisma) => db.oboPermitType.create({ data })
const update = (id, data, db = prisma) => db.oboPermitType.update({ where: { id }, data })
const attachForm = (id, formId, db = prisma) =>
  db.oboPermitType.update({ where: { id }, data: { formId } })

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
