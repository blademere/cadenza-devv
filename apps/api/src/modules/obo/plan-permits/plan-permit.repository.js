import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const applicationInclude = {
  permitType: true,
  clientPerson: {
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      suffix: true,
      email: true,
      phone: true,
    },
  },
  submissionAppointment: true,
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const findPersonByUserId = (userId, db = prisma) =>
  db.person.findUnique({ where: { userId } })

const findPersonNotificationContext = (personId, db = prisma) =>
  db.person.findUnique({
    where: { id: personId },
    select: {
      userId: true,
      email: true,
      user: { select: { email: true } },
    },
  })

const findById = (id, db = prisma) =>
  db.oboPermitApplication.findUnique({
    where: { id },
    include: applicationInclude,
  })

const findOwnedByClient = (id, clientPersonId, db = prisma) =>
  db.oboPermitApplication.findFirst({
    where: { id, clientPersonId },
    include: applicationInclude,
  })

const listByClient = (clientPersonId, db = prisma) =>
  db.oboPermitApplication.findMany({
    where: { clientPersonId },
    include: applicationInclude,
    orderBy: { createdAt: 'desc' },
  })

const create = (data, db = prisma) =>
  db.oboPermitApplication.create({
    data,
    include: applicationInclude,
  })

const update = (id, data, db = prisma) =>
  db.oboPermitApplication.update({
    where: { id },
    data,
    include: applicationInclude,
  })

const withTransaction = (callback) => prisma.$transaction(callback)

export {
  findPersonByUserId,
  findPersonNotificationContext,
  findById,
  findOwnedByClient,
  listByClient,
  create,
  update,
  withTransaction,
}
