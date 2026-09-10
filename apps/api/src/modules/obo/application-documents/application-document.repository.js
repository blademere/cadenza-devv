import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const checklistInclude = {
  requirement: { include: { documentType: true } },
  document: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, createdAt: true } },
  receivedBy: { select: { id: true, email: true } },
  verifiedBy: { select: { id: true, email: true } },
}

const listByApplicationId = (applicationId, db = prisma) =>
  db.oboPermitApplicationDocument.findMany({
    where: { applicationId },
    include: checklistInclude,
    orderBy: { requirement: { sortOrder: 'asc' } },
  })

const findByApplicationAndRequirement = (applicationId, requirementId, db = prisma) =>
  db.oboPermitApplicationDocument.findUnique({
    where: { applicationId_requirementId: { applicationId, requirementId } },
    include: checklistInclude,
  })

const createMany = (data, db = prisma) =>
  db.oboPermitApplicationDocument.createMany({ data, skipDuplicates: true })

const updateStatus = (id, data, db = prisma) =>
  db.oboPermitApplicationDocument.update({
    where: { id },
    data,
    include: checklistInclude,
  })

const withTransaction = (callback) => prisma.$transaction(callback)

export {
  listByApplicationId,
  findByApplicationAndRequirement,
  createMany,
  updateStatus,
  withTransaction,
}
