import crypto from 'node:crypto'
import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import * as formRepository from '../../../platform/forms/form.repository.js'
import * as workflowRepository from '../../../platform/workflow/workflow.repository.js'

const prisma = getPrismaClient()
const reference = () => `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPersonNotificationContext = (personId, db = prisma) => db.person.findUnique({ where: { id: personId }, select: { userId: true, email: true, user: { select: { email: true } } } })
const findFormById = (id, db = prisma) => formRepository.findById(id, db)
const findFormVersionById = (id, db = prisma) => formRepository.findVersionById(id, db)
const findWorkflowInstance = (id, db = prisma) => workflowRepository.findInstance(id, db)

const applicationInclude = {
  permitType: true,
  submissionAppointment: true,
  replacedApplication: true,
  replacementApplications: { orderBy: { createdAt: 'asc' } },
  decisions: { orderBy: { decidedAt: 'desc' } },
}

const attachFormVersion = async (application, db = prisma) => {
  if (!application?.formVersionId) return { ...application, formVersion: null }
  const formVersion = await formRepository.findVersionById(application.formVersionId, db)
  return { ...application, formVersion }
}

const findById = async (id, db = prisma) => {
  const application = await db.oboPermitApplication.findUnique({ where: { id }, include: applicationInclude })
  return attachFormVersion(application, db)
}
const findOwnedByClient = async (id, personId, db = prisma) => {
  const application = await db.oboPermitApplication.findFirst({ where: { id, clientPersonId: personId }, include: applicationInclude })
  return attachFormVersion(application, db)
}
const listByClient = async (personId, db = prisma) => {
  const applications = await db.oboPermitApplication.findMany({ where: { clientPersonId: personId }, include: { permitType: true, submissionAppointment: true, replacedApplication: true }, orderBy: { createdAt: 'desc' } })
  return Promise.all(applications.map((application) => attachFormVersion(application, db)))
}
const create = async ({ clientPersonId, permitTypeId, formVersionId, formValues, userId, replacesApplicationId, caseId }, db = prisma) => {
  if (!caseId) throw new Error('caseId is required when creating a permit application.')
  const permitType = await db.oboPermitType.findFirst({ where: { id: permitTypeId, isActive: true } })
  if (!permitType) return null
  const referenceNumber = reference()
  const application = await db.oboPermitApplication.create({ data: { referenceNumber, caseId, clientPersonId, permitTypeId, formVersionId, replacesApplicationId: replacesApplicationId || null, formValues }, include: { permitType: true, replacedApplication: true } })
  return attachFormVersion(application, db)
}
const update = async (id, data, db = prisma) => {
  const application = await db.oboPermitApplication.update({ where: { id }, data, include: applicationInclude })
  return attachFormVersion(application, db)
}
const withTransaction = (callback) => prisma.$transaction(callback)

export { findPersonByUserId, findPersonNotificationContext, findFormById, findFormVersionById, findWorkflowInstance, findById, findOwnedByClient, listByClient, create, update, withTransaction }
