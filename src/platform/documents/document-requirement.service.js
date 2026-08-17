const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")

const MAX_CONDITION_DEPTH = 8
const MAX_FILE_TYPES = 32
const MAX_FILE_SIZE = 1024 * 1024 * 1024
const SAFE_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/
const SAFE_MIME = /^(?:[a-z0-9!#$&^_.+-]+)\/(?:[a-z0-9!#$&^_.+-]+|\*)$/i
const SAFE_EXTENSION = /^\.[a-z0-9]{1,16}$/i

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value)

const assertCondition = (condition, fieldKeys = null, depth = 0) => {
  if (condition == null) return
  if (depth > MAX_CONDITION_DEPTH || !isObject(condition)) throw new BadRequestError("Document requirement condition is invalid or too deeply nested.")
  const groups = ["all", "any"].filter((key) => condition[key] !== undefined)
  if (groups.length > 1 || (condition.not !== undefined && (groups.length || condition.field !== undefined))) throw new BadRequestError("A document requirement condition must contain exactly one expression.")
  if (groups.length) {
    if (!Array.isArray(condition[groups[0]]) || condition[groups[0]].length === 0) throw new BadRequestError(`Condition '${groups[0]}' must be a non-empty array.`)
    condition[groups[0]].forEach((item) => assertCondition(item, fieldKeys, depth + 1))
    return
  }
  if (condition.not !== undefined) return assertCondition(condition.not, fieldKeys, depth + 1)
  if (typeof condition.field !== "string" || (fieldKeys && !fieldKeys.has(condition.field))) throw new BadRequestError(`Condition references unknown field '${condition.field}'.`)
  const operators = ["equals", "not_equals", "in", "not_in", "contains", "exists"]
  if (!operators.includes(condition.operator)) throw new BadRequestError(`Unsupported document requirement condition operator '${condition.operator}'.`)
  if (condition.operator !== "exists" && condition.value === undefined) throw new BadRequestError(`Operator '${condition.operator}' requires a value.`)
  if (["in", "not_in"].includes(condition.operator) && (!Array.isArray(condition.value) || condition.value.length === 0)) throw new BadRequestError(`Operator '${condition.operator}' requires a non-empty array.`)
}

const normalizeFileType = (value) => {
  if (typeof value !== "string") throw new BadRequestError("Allowed file types must be strings.")
  const normalized = value.trim().toLowerCase()
  if (!SAFE_MIME.test(normalized) && !SAFE_EXTENSION.test(normalized)) throw new BadRequestError(`Invalid allowed file type '${value}'.`)
  return normalized
}

const validateRequirementDefinition = ({ name, documentTypeId, required = true, allowedFileTypes = [], maxSizeBytes = null, condition = null, source = "CLIENT", fieldKey = null, sortOrder = 0 }, fieldKeys = null) => {
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) throw new BadRequestError("Document requirement name is required and must be at most 200 characters.")
  if (!documentTypeId || typeof documentTypeId !== "string") throw new BadRequestError("Document type is required.")
  if (typeof required !== "boolean") throw new BadRequestError("Document requirement 'required' must be boolean.")
  if (!Array.isArray(allowedFileTypes) || allowedFileTypes.length === 0 || allowedFileTypes.length > MAX_FILE_TYPES) throw new BadRequestError("A document requirement must define between 1 and 32 allowed file types.")
  const types = [...new Set(allowedFileTypes.map(normalizeFileType))]
  if (maxSizeBytes != null && (!Number.isSafeInteger(maxSizeBytes) || maxSizeBytes <= 0 || maxSizeBytes > MAX_FILE_SIZE)) throw new BadRequestError("maxSizeBytes must be a positive integer no larger than 1 GiB.")
  if (condition != null) assertCondition(condition, fieldKeys)
  if (fieldKey != null && (typeof fieldKey !== "string" || !SAFE_KEY.test(fieldKey) || (fieldKeys && !fieldKeys.has(fieldKey)))) throw new BadRequestError(`Unknown or invalid requirement field '${fieldKey}'.`)
  if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new BadRequestError("sortOrder must be a non-negative integer.")
  const allowedSources = ["CLIENT", "STAFF", "SYSTEM", "EXTERNAL"]
  if (!allowedSources.includes(source)) throw new BadRequestError(`Unsupported document requirement source '${source}'.`)
  return { name: name.trim(), documentTypeId, required, allowedFileTypes: types, maxSizeBytes, condition, source, fieldKey, sortOrder }
}

const getParentVersion = async ({ formVersionId = null, workflowVersionId = null }) => {
  if ((formVersionId && workflowVersionId) || (!formVersionId && !workflowVersionId)) throw new BadRequestError("Exactly one parent version is required.")
  if (formVersionId) {
    const version = await prisma.formVersion.findUnique({ where: { id: formVersionId }, include: { fields: { select: { key: true } } } })
    if (!version) throw new NotFoundError("Form version was not found.")
    return { kind: "form", version, fieldKeys: new Set(version.fields.map((field) => field.key)) }
  }
  const version = await prisma.workflowVersion.findUnique({ where: { id: workflowVersionId }, include: { steps: { select: { key: true } } } })
  if (!version) throw new NotFoundError("Workflow version was not found.")
  return { kind: "workflow", version, fieldKeys: null }
}

const assertDraft = (version) => { if (version.status !== "DRAFT") throw new ConflictError("Published or archived configurations are immutable.") }

const createRequirement = async ({ formVersionId = null, workflowVersionId = null, actorId = null, ...input }) => {
  const parent = await getParentVersion({ formVersionId, workflowVersionId })
  assertDraft(parent.version)
  const data = validateRequirementDefinition(input, parent.fieldKeys)
  const requirement = await prisma.documentRequirement.create({ data: { ...data, formVersionId, workflowVersionId } })
  return requirement
}

const updateRequirement = async ({ id, actorId = null, ...input }) => {
  const existing = await prisma.documentRequirement.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Document requirement was not found.")
  const parent = await getParentVersion({ formVersionId: existing.formVersionId, workflowVersionId: existing.workflowVersionId })
  assertDraft(parent.version)
  const data = validateRequirementDefinition({ ...existing, ...input }, parent.fieldKeys)
  return prisma.documentRequirement.update({ where: { id }, data })
}

const deleteRequirement = async ({ id }) => {
  const existing = await prisma.documentRequirement.findUnique({ where: { id } })
  if (!existing) throw new NotFoundError("Document requirement was not found.")
  const parent = await getParentVersion({ formVersionId: existing.formVersionId, workflowVersionId: existing.workflowVersionId })
  assertDraft(parent.version)
  return prisma.documentRequirement.delete({ where: { id } })
}

const validateUploadedFile = ({ requirement, mimeType, extension, sizeBytes }) => {
  if (!requirement || !Array.isArray(requirement.allowedFileTypes)) throw new BadRequestError("Invalid document requirement.")
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new BadRequestError("File size is invalid.")
  if (requirement.maxSizeBytes != null && sizeBytes > Number(requirement.maxSizeBytes)) throw new BadRequestError("File exceeds the maximum allowed size.")
  const normalizedMime = typeof mimeType === "string" ? mimeType.trim().toLowerCase() : ""
  const normalizedExtension = typeof extension === "string" ? (extension.startsWith(".") ? extension : `.${extension}`).toLowerCase() : ""
  const allowed = requirement.allowedFileTypes.map((item) => String(item).toLowerCase())
  const accepted = allowed.some((type) => type === normalizedMime || type === normalizedExtension || (type.endsWith("/*") && normalizedMime.startsWith(type.slice(0, -1))))
  if (!accepted) throw new BadRequestError("File type is not allowed for this requirement.")
  return true
}

module.exports = { validateRequirementDefinition, assertCondition, createRequirement, updateRequirement, deleteRequirement, validateUploadedFile, getParentVersion }
