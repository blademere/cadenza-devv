const { BadRequestError, ConflictError, NotFoundError } = require('../../common/errors/appError')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const {
  createDefinition,
  findDefinitionById,
  createCaseRequirement,
  findCaseRequirement,
  listCaseRequirements,
  updateCaseRequirement,
} = require('./requirements.repository')

const prisma = getPrismaClient()

const createRequirementDefinition = async (data) => {
  if (!data.key?.trim() || !data.name?.trim()) {
    throw new BadRequestError('key and name are required.')
  }
  return createDefinition({ ...data, key: data.key.trim(), name: data.name.trim() })
}

const attachToCase = async ({ caseId, requirementId, dueAt, metadata }) => {
  const [caseRecord, requirement] = await Promise.all([
    prisma.caseRecord.findUnique({ where: { id: caseId }, select: { id: true } }),
    findDefinitionById(requirementId),
  ])
  if (!caseRecord) throw new NotFoundError('Case not found.')
  if (!requirement || !requirement.isActive) throw new NotFoundError('Active requirement definition not found.')
  const existing = await findCaseRequirement(caseId, requirementId)
  if (existing) throw new ConflictError('Requirement is already attached to this case.')
  return createCaseRequirement({ caseId, requirementId, dueAt, metadata })
}

const listForCase = async (caseId) => {
  const caseRecord = await prisma.caseRecord.findUnique({ where: { id: caseId }, select: { id: true } })
  if (!caseRecord) throw new NotFoundError('Case not found.')
  return listCaseRequirements(caseId)
}

const updateStatus = async ({ id, status, notes, submittedAt, verifiedAt }) => {
  if (!status?.trim()) throw new BadRequestError('status is required.')
  try {
    return await updateCaseRequirement(id, {
      status: status.trim(),
      ...(notes !== undefined ? { notes } : {}),
      ...(submittedAt !== undefined ? { submittedAt } : {}),
      ...(verifiedAt !== undefined ? { verifiedAt } : {}),
    })
  } catch (error) {
    if (error?.code === 'P2025') throw new NotFoundError('Case requirement not found.')
    throw error
  }
}

module.exports = {
  createRequirementDefinition,
  attachToCase,
  listForCase,
  updateStatus,
}
