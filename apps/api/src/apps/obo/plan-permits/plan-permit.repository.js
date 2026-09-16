import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { requireAppId, withAppId } from '../../../platform/applications/application-scope.js'

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
  caseRecord: {
    select: {
      id: true,
      caseNumber: true,
      status: true,
      participants: {
        include: { person: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      requirements: {
        include: {
          requirement: true,
          applicationDocuments: {
            include: { document: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
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

const findById = (id, appId, db = prisma) =>
  db.oboPermitApplication.findFirst({
    where: withAppId({ id }, appId),
    include: applicationInclude,
  })

const findOwnedByClient = (id, clientPersonId, appId, db = prisma) =>
  db.oboPermitApplication.findFirst({
    where: withAppId({ id, clientPersonId }, appId),
    include: applicationInclude,
  })

const listByClient = (clientPersonId, appId, db = prisma) =>
  db.oboPermitApplication.findMany({
    where: withAppId({ clientPersonId }, appId),
    include: applicationInclude,
    orderBy: { createdAt: 'desc' },
  })

const create = (data, db = prisma) => {
  const appId = requireAppId(data?.appId)
  return db.oboPermitApplication.create({
    data: { ...data, appId },
    include: applicationInclude,
  })
}

const update = async (id, appId, data, db = prisma) => {
  const result = await db.oboPermitApplication.updateMany({
    where: withAppId({ id }, appId),
    data,
  })
  if (!result.count) return null
  return db.oboPermitApplication.findUnique({
    where: { id },
    include: applicationInclude,
  })
}

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
