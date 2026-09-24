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
  db.cadenzaStaff.findFirst({
    where: { id, appId },
    include: { person: { select: personSelect } },
  })

const findByPersonId = (personId, appId, db = prisma) =>
  db.cadenzaStaff.findFirst({
    where: { personId, appId },
    include: { person: { select: personSelect } },
  })

const list = (appId, db = prisma) =>
  db.cadenzaStaff.findMany({
    where: { appId },
    include: { person: { select: personSelect } },
    orderBy: [{ status: 'asc' }, { person: { lastName: 'asc' } }, { person: { firstName: 'asc' } }],
  })

const create = (data, db = prisma) =>
  db.cadenzaStaff.create({
    data,
    include: { person: { select: personSelect } },
  })

const update = (id, appId, data, db = prisma) =>
  db.cadenzaStaff.updateMany({ where: { id, appId }, data })

export { findById, findByPersonId, list, create, update }
