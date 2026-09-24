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

const listCandidates = (appId, db = prisma) =>
  db.person.findMany({
    where: { isActive: true, userId: { not: null }, cadenzaStaff: { none: { appId } } },
    select: personSelect,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })

const create = async (data, db = prisma) => db.$transaction(async (tx) => {
  const person = await tx.person.findUnique({
    where: { id: data.personId },
    select: { userId: true },
  })
  if (!person?.userId) return null

  await tx.appMembership.upsert({
    where: { appId_userId: { appId: data.appId, userId: person.userId } },
    update: { isActive: true },
    create: { appId: data.appId, userId: person.userId },
  })

  return tx.cadenzaStaff.create({
    data,
    include: { person: { select: personSelect } },
  })
})

const update = (id, appId, data, db = prisma) =>
  db.cadenzaStaff.updateMany({ where: { id, appId }, data })

export { findById, findByPersonId, list, listCandidates, create, update }
