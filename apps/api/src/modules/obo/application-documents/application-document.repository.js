import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listByApplicationId = (applicationId, db = prisma) =>
  db.oboPermitApplicationDocument.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'asc' },
  })

const findByApplicationAndRequirement = (applicationId, requirementId, db = prisma) =>
  db.oboPermitApplicationDocument.findUnique({
    where: { applicationId_requirementId: { applicationId, requirementId } },
  })

const createMany = (data, db = prisma) =>
  db.oboPermitApplicationDocument.createMany({ data, skipDuplicates: true })

const updateStatus = (id, data, db = prisma) =>
  db.oboPermitApplicationDocument.update({
    where: { id },
    data,
  })

export {
  listByApplicationId,
  findByApplicationAndRequirement,
  createMany,
  updateStatus,
}
