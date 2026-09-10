import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/appError.js'
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

const createRequirementDefinition = async (data, db) => {
  if (!data.key?.trim() || !data.name?.trim()) {
    throw new BadRequestError('key and name are required.')
  }
  return createDefinition({
    ...data,
    key: data.key.trim(),
    name: data.name.trim(),
  }, db)
}

const getDefinitionById = (id, db) => findDefinitionById(id, db)

const attachToCase = async ({ caseId, requirementId, dueAt, metadata, db }) => {
  const [caseRecord, requirement] = await Promise.all([
    findCase(caseId, db),
    findDefinitionById(requirementId, db),
  ])
  if (!caseRecord) throw new NotFoundError('Case not found.')
  if (!requirement || !requirement.isActive)
    throw new NotFoundError('Active requirement definition not found.')
  const existing = await findCaseRequirement(caseId, requirementId, db)
  if (existing)
    throw new ConflictError('Requirement is already attached to this case.')
  return createCaseRequirement({ caseId, requirementId, dueAt, metadata }, db)
}

const attachDefinitionsToCase = async ({ caseId, requirementIds = [], metadata, db }) => {
  const ids = [...new Set(requirementIds.filter(Boolean))]
  if (!ids.length) return []

  const caseRecord = await findCase(caseId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')

  const definitions = await findDefinitionsByIds(ids, db)
  const activeById = new Map(definitions.filter((definition) => definition.isActive).map((definition) => [definition.id, definition]))
  const missing = ids.filter((id) => !activeById.has(id))
  if (missing.length) throw new NotFoundError('One or more active requirement definitions were not found.')

  const attached = []
  for (const requirementId of ids) {
    const existing = await findCaseRequirement(caseId, requirementId, db)
    if (existing) {
      attached.push(existing)
      continue
    }
    attached.push(await createCaseRequirement({
      caseId,
      requirementId,
      metadata,
    }, db))
  }
  return attached
}

const listForCase = async (caseId, db) => {
  const caseRecord = await findCase(caseId, db)
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listCaseRequirements(caseId, db)
}

const updateStatus = async ({ id, status, notes, submittedAt, verifiedAt, db }) => {
  if (!status?.trim()) throw new BadRequestError('status is required.')
  try {
    return await updateCaseRequirement(id, {
      status: status.trim(),
      ...(notes !== undefined ? { notes } : {}),
      ...(submittedAt !== undefined ? { submittedAt } : {}),
      ...(verifiedAt !== undefined ? { verifiedAt } : {}),
    }, db)
  } catch (error) {
    if (error?.code === 'P2025')
      throw new NotFoundError('Case requirement not found.')
    throw error
  }
}

export {
  createRequirementDefinition,
  getDefinitionById,
  attachToCase,
  attachDefinitionsToCase,
  listForCase,
  updateStatus,
}
