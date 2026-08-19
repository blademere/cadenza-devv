const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const createDefinition = (data) => prisma.requirementDefinition.create({ data })
const findDefinitionById = (id) => prisma.requirementDefinition.findUnique({ where: { id } })
const createCaseRequirement = (data) => prisma.caseRequirement.create({ data, include: { requirement: true } })
const findCaseRequirement = (caseId, requirementId) =>
  prisma.caseRequirement.findUnique({
    where: { caseId_requirementId: { caseId, requirementId } },
  })
const listCaseRequirements = (caseId) =>
  prisma.caseRequirement.findMany({
    where: { caseId },
    include: { requirement: true },
    orderBy: { createdAt: 'asc' },
  })
const updateCaseRequirement = (id, data) =>
  prisma.caseRequirement.update({ where: { id }, data, include: { requirement: true } })

module.exports = {
  createDefinition,
  findDefinitionById,
  createCaseRequirement,
  findCaseRequirement,
  listCaseRequirements,
  updateCaseRequirement,
}
