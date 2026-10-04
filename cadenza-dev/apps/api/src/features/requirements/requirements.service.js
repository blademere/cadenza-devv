import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import {
  createDefinition,
  findDefinitionById,
  findDefinitionsByIds,
  createCaseRequirement,
  findCaseRequirement,
  findCase,
  listCaseRequirements,
  updateCaseRequirement,
} from './requirements.repository.js'

const requireAppId = (appId) => {
  if (!appId) throw new BadRequestError('appId is required.')
}

const createRequirementDefinition = async (data, { appId, db } = {}) => {
  requireAppId(appId)
  if (!data.key?.trim() || !data.name?.trim()) throw new BadRequestError('key and name are required.')
  return createDefinition({ ...data, appId, key: data.key.trim(), name: data.name.trim() }, db)
}

const getDefinitionById = (id, { appId, db } = {}) => {
  requireAppId(appId)
  return findDefinitionById(id, appId, db)
}

const attachToCase = async ({ caseId, requirementId, dueAt, metadata, appId, db }) => {
  requireAppId(appId)
  const [caseRecord, requirement] = await Promise.all([findCase(caseId, appId, db), findDefinitionById(requirementId, appId, db)])
  if (!caseRecord) throw new NotFoundError('Case not found.')
  if (!requirement || !requirement.isActive) throw new NotFoundError('Active requirement definition not found.')
  const existing = await findCaseRequirement(caseId, requirementId, appId, db)
  if (existing) throw new ConflictError('Requirement is already attached to this case.')
  return createCaseRequirement({ caseId, requirementId, dueAt, metadata }, db)
}

const attachDefinitionsToCase = async ({ caseId, requirementIds = [], metadata, appId, db }) => {
  requireAppId(appId)
  const ids = [...new Set(requirementIds.filter(Boolean))]
  if (!ids.length) return []
  const caseRecord = await findCase(caseId, appId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')
  const definitions = await findDefinitionsByIds(ids, appId, db)
  const activeById = new Map(definitions.filter((definition) => definition.isActive).map((definition) => [definition.id, definition]))
  if (ids.some((id) => !activeById.has(id))) throw new NotFoundError('One or more active requirement definitions were not found.')
  const attached = []
  for (const requirementId of ids) {
    const existing = await findCaseRequirement(caseId, requirementId, appId, db)
    if (existing) { attached.push(existing); continue }
    attached.push(await createCaseRequirement({ caseId, requirementId, metadata }, db))
  }
  return attached
}

const listForCase = async (caseId, { appId, db } = {}) => {
  requireAppId(appId)
  const caseRecord = await findCase(caseId, appId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listCaseRequirements(caseId, appId, db)
}

const updateStatus = async ({ id, status, notes, submittedAt, verifiedAt, appId, db }) => {
  requireAppId(appId)
  if (!status?.trim()) throw new BadRequestError('status is required.')
  const result = await updateCaseRequirement(id, appId, {
    status: status.trim(),
    ...(notes !== undefined ? { notes } : {}),
    ...(submittedAt !== undefined ? { submittedAt } : {}),
    ...(verifiedAt !== undefined ? { verifiedAt } : {}),
  }, db)
  if (!result.count) throw new NotFoundError('Case requirement not found.')
  return db?.caseRequirement?.findFirst
    ? db.caseRequirement.findFirst({ where: { id, caseRecord: { appId } }, include: { requirement: true } })
    : result
}

export { createRequirementDefinition, getDefinitionById, attachToCase, attachDefinitionsToCase, listForCase, updateStatus }
