import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const applicationInclude = {
  permitType: true,
  clientPerson: { select: { id: true, firstName: true, middleName: true, lastName: true, suffix: true, email: true, phone: true } },
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
          applicationDocuments: { include: { document: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      tasks: {
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      },
    },
  },
  submissionAppointment: true,
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const findApplication = (id, db = prisma) =>
  db.oboPermitApplication.findUnique({ where: { id }, include: applicationInclude })

const listApplications = (status, db = prisma) =>
  db.oboPermitApplication.findMany({
    where: { workflowInstanceId: { not: null } },
    include: applicationInclude,
    orderBy: { createdAt: 'asc' },
  })

const updateApplication = (id, data, db = prisma) =>
  db.oboPermitApplication.update({ where: { id }, data, include: applicationInclude })

const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })

const findPersonNotificationContext = (personId, db = prisma) =>
  db.person.findUnique({
    where: { id: personId },
    select: { userId: true, email: true, user: { select: { email: true } } },
  })

const withTransaction = (callback) => prisma.$transaction(callback)

export { findApplication, listApplications, updateApplication, addDecision, findPersonNotificationContext, withTransaction }
