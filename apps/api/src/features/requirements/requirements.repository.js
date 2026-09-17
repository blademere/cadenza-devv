import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const requireAppId = (appId) => {
  if (!appId) throw new Error('appId is required for requirement operations.')
}

const createDefinition = (data, db = prisma) => {
  requireAppId(data?.appId)
  return db.requirementDefinition.create({ data })
}
const findDefinitionById = (id, appId, db = prisma) => {
  requireAppId(appId)
  return db.requirementDefinition.findFirst({ where: { id, appId } })
}
const findDefinitionsByIds = (ids, appId, db = prisma) => {
  requireAppId(appId)
  return db.requirementDefinition.findMany({ where: { id: { in: ids }, appId } })
}
const createCaseRequirement = (data, db = prisma) => db.caseRequirement.create({ data, include: { requirement: true } })
const findCaseRequirement = (caseId, requirementId, appId, db = prisma) => db.caseRequirement.findFirst({
  where: { caseId, requirementId, caseRecord: { appId } },
})
const findCase = (id, appId, db = prisma) => {
  requireAppId(appId)
  return db.caseRecord.findFirst({ where: { id, appId }, select: { id: true, appId: true } })
}
const listCaseRequirements = (caseId, appId, db = prisma) => db.caseRequirement.findMany({
  where: { caseId, caseRecord: { appId } },
  include: { requirement: true },
  orderBy: { createdAt: 'asc' },
})
const updateCaseRequirement = (id, appId, data, db = prisma) => db.caseRequirement.updateMany({
  where: { id, caseRecord: { appId } },
  data,
})

export { createDefinition, findDefinitionById, findDefinitionsByIds, createCaseRequirement, findCaseRequirement, findCase, listCaseRequirements, updateCaseRequirement }
