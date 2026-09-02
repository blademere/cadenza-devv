import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const createDefinition = (data) => prisma.requirementDefinition.create({ data })
const findDefinitionById = (id) =>
  prisma.requirementDefinition.findUnique({ where: { id } })
const createCaseRequirement = (data) =>
  prisma.caseRequirement.create({ data, include: { requirement: true } })
const findCaseRequirement = (caseId, requirementId) =>
  prisma.caseRequirement.findUnique({
    where: { caseId_requirementId: { caseId, requirementId } },
  })
const findCase = (id) =>
  prisma.caseRecord.findUnique({ where: { id }, select: { id: true } })
const listCaseRequirements = (caseId) =>
  prisma.caseRequirement.findMany({
    where: { caseId },
    include: { requirement: true },
    orderBy: { createdAt: 'asc' },
  })
const updateCaseRequirement = (id, data) =>
  prisma.caseRequirement.update({
    where: { id },
    data,
    include: { requirement: true },
  })

export {
  createDefinition,
  findDefinitionById,
  createCaseRequirement,
  findCaseRequirement,
  findCase,
  listCaseRequirements,
  updateCaseRequirement,
}
