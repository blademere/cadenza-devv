import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createDefinition = (data, db = prisma) => db.requirementDefinition.create({ data })
const findDefinitionById = (id, db = prisma) =>
  db.requirementDefinition.findUnique({ where: { id } })
const findDefinitionsByIds = (ids, db = prisma) =>
  db.requirementDefinition.findMany({ where: { id: { in: ids } } })
const createCaseRequirement = (data, db = prisma) =>
  db.caseRequirement.create({ data, include: { requirement: true } })
const findCaseRequirement = (caseId, requirementId, db = prisma) =>
  db.caseRequirement.findUnique({
    where: { caseId_requirementId: { caseId, requirementId } },
  })
const findCase = (id, db = prisma) =>
  db.caseRecord.findUnique({ where: { id }, select: { id: true } })
const listCaseRequirements = (caseId, db = prisma) =>
  db.caseRequirement.findMany({
    where: { caseId },
    include: { requirement: true },
    orderBy: { createdAt: 'asc' },
  })
const updateCaseRequirement = (id, data, db = prisma) =>
  db.caseRequirement.update({
    where: { id },
    data,
    include: { requirement: true },
  })

export {
  createDefinition,
  findDefinitionById,
  findDefinitionsByIds,
  createCaseRequirement,
  findCaseRequirement,
  findCase,
  listCaseRequirements,
  updateCaseRequirement,
}
