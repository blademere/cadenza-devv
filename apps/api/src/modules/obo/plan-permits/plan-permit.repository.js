import crypto from 'node:crypto'
import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()
const reference = () => `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })
const findPermitType = (id, db = prisma) => db.oboPermitType.findFirst({ where: { id, isActive: true } })
const findProfessional = (id, db = prisma) => db.oboProfessional.findUnique({ where: { id } })
const findFormById = (id, db = prisma) => db.form.findUnique({ where: { id } })
const findFormVersionById = (id, db = prisma) => db.formVersion.findUnique({ where: { id }, include: { form: true } })
const findWorkflowInstance = (id, db = prisma) => db.workflowInstance.findUnique({ where: { id }, include: { currentStep: true } })
const findById = (id, db = prisma) => db.oboPermitApplication.findUnique({
  where: { id },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, replacedApplication: true, replacementApplications: { orderBy: { createdAt: 'asc' } }, decisions: { orderBy: { decidedAt: 'desc' } } },
})
const findOwnedByClient = (id, personId, db = prisma) => db.oboPermitApplication.findFirst({
  where: { id, clientPersonId: personId },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, replacedApplication: true, replacementApplications: { orderBy: { createdAt: 'asc' } }, decisions: { orderBy: { decidedAt: 'desc' } } },
})
const listByClient = (personId, db = prisma) => db.oboPermitApplication.findMany({
  where: { clientPersonId: personId },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, replacedApplication: true },
  orderBy: { createdAt: 'desc' },
})
const create = async ({ clientPersonId, permitTypeId, professionalId, formVersionId, formValues, userId, replacesApplicationId }, db = prisma) => {
  const permitType = await db.oboPermitType.findFirst({ where: { id: permitTypeId, isActive: true } })
  if (!permitType) return null
  const professional = await db.oboProfessional.findUnique({ where: { id: professionalId } })
  if (!professional) return { notFound: 'professional' }
  const caseType = await db.caseType.upsert({
    where: { key: 'obo-permit-application' },
    update: { name: 'OBO Permit Application', isActive: true },
    create: { key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle' },
  })
  const referenceNumber = reference()
  const caseRecord = await db.caseRecord.create({
    data: { caseNumber: referenceNumber, caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'OPEN', createdByUserId: userId },
  })
  return db.oboPermitApplication.create({
    data: { referenceNumber, caseId: caseRecord.id, clientPersonId, permitTypeId, professionalId, formVersionId, replacesApplicationId: replacesApplicationId || null, formValues },
    include: { permitType: true, professional: true, formVersion: true, replacedApplication: true },
  })
}
const update = (id, data, db = prisma) => db.oboPermitApplication.update({
  where: { id },
  data,
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, replacedApplication: true },
})
const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })
const createSubmissionAppointment = (data, db = prisma) => db.oboSubmissionAppointment.create({ data })
const withTransaction = (callback) => prisma.$transaction(callback)

export {
  findPersonByUserId,
  findPersonNotificationContext,
  findPermitType,
  findProfessional,
  findFormById,
  findFormVersionById,
  findWorkflowInstance,
  findById,
  findOwnedByClient,
  listByClient,
  create,
  update,
  addDecision,
  createSubmissionAppointment,
  withTransaction,
}
