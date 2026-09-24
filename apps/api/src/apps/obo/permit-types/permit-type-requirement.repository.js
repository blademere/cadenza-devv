import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listByPermitTypeId = (permitTypeId, db = prisma) =>
  db.oboPermitTypeRequirement.findMany({
    where: { permitTypeId },
    include: { requirement: true },
    orderBy: { createdAt: 'asc' },
  })

const create = (data, db = prisma) =>
  db.oboPermitTypeRequirement.create({ data, include: { requirement: true } })

const deleteByPermitTypeAndRequirement = (permitTypeId, requirementId, db = prisma) =>
  db.oboPermitTypeRequirement.delete({
    where: { permitTypeId_requirementId: { permitTypeId, requirementId } },
  })

const withTransaction = (callback) => prisma.$transaction(callback)

export { listByPermitTypeId, create, deleteByPermitTypeAndRequirement, withTransaction }
