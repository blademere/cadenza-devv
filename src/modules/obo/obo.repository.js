const { getPrismaClient } = require('../../infrastructure/database/prisma')
const crypto = require('node:crypto')
const prisma = getPrismaClient()
const reference = () => `OBO-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
const listPermitTypes = async () => prisma.oboPermitType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
const findPermitType = async (id) => prisma.oboPermitType.findFirst({ where: { id, isActive: true } })
const findPersonByUserId = async (userId) => prisma.person.findUnique({ where: { userId } })
const createApplication = async ({ clientPersonId, permitTypeId, professionalId, formVersionId, formValues, userId }) => prisma.$transaction(async (tx) => {
  const permitType = await tx.oboPermitType.findFirst({ where: { id: permitTypeId, isActive: true } })
  if (!permitType) return null
  const professional = await tx.oboProfessional.findUnique({ where: { id: professionalId } })
  if (!professional) return { notFound: 'professional' }
  const caseType = await tx.caseType.upsert({ where: { key: 'obo-permit-application' }, update: { name: 'OBO Permit Application', isActive: true }, create: { key: 'obo-permit-application', name: 'OBO Permit Application', description: 'OBO permit application lifecycle' } })
  const referenceNumber = reference()
  const caseRecord = await tx.caseRecord.create({ data: { caseNumber: referenceNumber, caseTypeId: caseType.id, title: `${permitType.name} Application`, status: 'DRAFT', createdByUserId: userId } })
  return tx.oboPermitApplication.create({ data: { referenceNumber, caseId: caseRecord.id, clientPersonId, permitTypeId, professionalId, formVersionId, formValues }, include: { permitType: true, professional: true } })
})
const findApplication = async (id) => prisma.oboPermitApplication.findUnique({ where: { id }, include: { permitType: true, professional: true, submissionAppointment: true, decisions: { orderBy: { decidedAt: 'desc' } } } })
const listApplicationsByClient = async (clientPersonId) => prisma.oboPermitApplication.findMany({ where: { clientPersonId }, include: { permitType: true, professional: true, submissionAppointment: true }, orderBy: { createdAt: 'desc' } })
const listReceivingApplications = async (status) => prisma.oboPermitApplication.findMany({ where: status ? { status } : { status: { in: ['SUBMISSION_SCHEDULED', 'SUBMITTED', 'FOR_RECEIVING_REVIEW'] } }, include: { permitType: true, professional: true, submissionAppointment: true }, orderBy: { createdAt: 'asc' } })
const updateApplication = async (id, data, db = prisma) => db.oboPermitApplication.update({ where: { id }, data, include: { permitType: true, professional: true, submissionAppointment: true } })
const createProfessional = async ({ personId, userId, registrationNumber }) => prisma.oboProfessional.create({ data: { personId, userId, registrationNumber } })
const findProfessional = async (id) => prisma.oboProfessional.findUnique({ where: { id } })
const listPendingProfessionals = async () => prisma.oboProfessional.findMany({ where: { status: 'PENDING_VERIFICATION' }, orderBy: { createdAt: 'asc' } })
const updateProfessional = async (id, data, db = prisma) => db.oboProfessional.update({ where: { id }, data })
const addProfessionalDecision = async (data, db = prisma) => db.oboProfessionalVerificationDecision.create({ data })
const addReceivingDecision = async (data, db = prisma) => db.oboReceivingDecision.create({ data })
module.exports = { listPermitTypes, findPermitType, findPersonByUserId, createApplication, findApplication, listApplicationsByClient, listReceivingApplications, updateApplication, createProfessional, findProfessional, listPendingProfessionals, updateProfessional, addProfessionalDecision, addReceivingDecision }
