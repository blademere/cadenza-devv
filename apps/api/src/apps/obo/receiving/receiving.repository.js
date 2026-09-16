import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import { withAppId } from '../../../platform/applications/application-scope.js'

const prisma = getPrismaClient()

const applicationInclude = {
  permitType: true,
  clientPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, email: true, phone: true } },
  caseRecord: {
    select: {
      id: true,
      appId: true,
      caseNumber: true,
      status: true,
      participants: { include: { person: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      requirements: { include: { requirement: true, applicationDocuments: { include: { document: true } } }, orderBy: { createdAt: 'asc' } },
      tasks: { orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }] },
    },
  },
  submissionAppointment: true,
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const findApplication = (id, appId, db = prisma) =>
  db.oboPermitApplication.findFirst({ where: withAppId({ id }, appId), include: applicationInclude })

const listApplications = (status, appId, db = prisma) =>
  db.oboPermitApplication.findMany({
    where: withAppId({ workflowInstanceId: { not: null } }, appId),
    include: applicationInclude,
    orderBy: { createdAt: 'asc' },
  })

const updateApplication = async (id, appId, data, db = prisma) => {
  const result = await db.oboPermitApplication.updateMany({ where: withAppId({ id }, appId), data })
  if (!result.count) return null
  return db.oboPermitApplication.findFirst({ where: withAppId({ id }, appId), include: applicationInclude })
}

const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })

const findPersonNotificationContext = (personId, db = prisma) =>
  db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })

const withTransaction = (callback) => prisma.$transaction(callback)

export { findApplication, listApplications, updateApplication, addDecision, findPersonNotificationContext, withTransaction }
