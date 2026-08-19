const crypto = require('node:crypto')
const { getPrismaClient } = require('../../../infrastructure/database/prisma')

const prisma = getPrismaClient()
const reference = () => `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const findPersonByUserId = (userId, db = prisma) => db.person.findUnique({ where: { userId } })
const findPermitType = (id, db = prisma) => db.oboPermitType.findFirst({ where: { id, isActive: true } })
const findProfessional = (id, db = prisma) => db.oboProfessional.findUnique({ where: { id } })
const findFormById = (id, db = prisma) => db.form.findUnique({ where: { id } })
const findFormVersionById = (id, db = prisma) => db.formVersion.findUnique({ where: { id }, include: { form: true } })
const findWorkflowInstance = (id, db = prisma) => db.workflowInstance.findUnique({ where: { id }, include: { currentStep: true } })
const findById = (id, db = prisma) => db.oboPermitApplication.findUnique({
  where: { id },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, decisions: { orderBy: { decidedAt: 'desc' } } },
})
const findOwnedByClient = (id, personId, db = prisma) => db.oboPermitApplication.findFirst({
  where: { id, clientPersonId: personId },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true, decisions: { orderBy: { decidedAt: 'desc' } } },
})
const listByClient = (personId, db = prisma) => db.oboPermitApplication.findMany({
  where: { clientPersonId: personId },
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true },
  orderBy: { createdAt: 'desc' },
})
const create = async ({ clientPersonId, permitTypeId, professionalId, formVersionId, formValues, userId }, db = prisma) => {
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
    data: { referenceNumber, caseId: caseRecord.id, clientPersonId, permitTypeId, professionalId, formVersionId, formValues },
    include: { permitType: true, professional: true, formVersion: true },
  })
}
const update = (id, data, db = prisma) => db.oboPermitApplication.update({
  where: { id }, data,
  include: { permitType: true, professional: true, formVersion: true, submissionAppointment: true },
})
const addDecision = (data, db = prisma) => db.oboReceivingDecision.create({ data })
const createSubmissionAppointment = (data, db = prisma) => db.oboSubmissionAppointment.create({ data })

module.exports = {
  findPersonByUserId,
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
}
