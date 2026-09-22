import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const personSelect = {
  id: true,
  userId: true,
  firstName: true,
  middleName: true,
  lastName: true,
  suffix: true,
  email: true,
  phone: true,
  isActive: true,
}

const findById = (id, appId, db = prisma) =>
  db.cadenzaCustomer.findFirst({
    where: { id, appId },
    include: { person: { select: personSelect } },
  })

const findByPersonId = (personId, appId, db = prisma) =>
  db.cadenzaCustomer.findFirst({
    where: { personId, appId },
    include: { person: { select: personSelect } },
  })

const findByUserId = (userId, appId, db = prisma) =>
  db.cadenzaCustomer.findFirst({
    where: { appId, person: { userId: Number(userId) } },
    include: { person: { select: personSelect } },
  })

const list = (appId, db = prisma) =>
  db.cadenzaCustomer.findMany({
    where: { appId, status: 'ACTIVE', person: { isActive: true } },
    include: { person: { select: personSelect } },
    orderBy: [{ person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
  })

const create = (data, db = prisma) =>
  db.cadenzaCustomer.create({
    data,
    include: { person: { select: personSelect } },
  })

const update = (id, appId, data, db = prisma) =>
  db.cadenzaCustomer.updateMany({ where: { id, appId }, data })

export { findById, findByPersonId, findByUserId, list, create, update }
