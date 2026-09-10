import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listByApplicationId = (applicationId, db = prisma) =>
  db.oboPermitApplicationDocument.findMany({
    where: { applicationId },
    include: { caseRequirement: { include: { requirement: true } }, document: true },
    orderBy: { createdAt: 'asc' },
  })

const findByApplicationAndCaseRequirement = (applicationId, caseRequirementId, db = prisma) =>
  db.oboPermitApplicationDocument.findUnique({
    where: { applicationId_caseRequirementId: { applicationId, caseRequirementId } },
    include: { caseRequirement: { include: { requirement: true } }, document: true },
  })

const createMany = (data, db = prisma) =>
  db.oboPermitApplicationDocument.createMany({ data, skipDuplicates: true })

const update = (id, data, db = prisma) =>
  db.oboPermitApplicationDocument.update({
    where: { id },
    data,
    include: { caseRequirement: { include: { requirement: true } }, document: true },
  })

export {
  listByApplicationId,
  findByApplicationAndCaseRequirement,
  createMany,
  update,
}
