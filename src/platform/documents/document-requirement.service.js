const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")
const { prisma } = require("../../infrastructure/database/prisma")

const assertCondition = (condition) => {
  if (condition == null || condition === "") return true
  if (typeof condition !== "object" || Array.isArray(condition)) throw new BadRequestError("Document requirement condition must be an object.")
  return true
}

const validateRequirementDefinition = ({ name, documentTypeId, required = false, allowedFileTypes = [], maxSizeBytes = null, condition = null, source = "SYSTEM", fieldKey = null, sortOrder = 0 }, fieldKeys = null) => {
  if (typeof name !== "string" || !name.trim()) throw new BadRequestError("Document requirement name is required.")
  if (!Number.isInteger(documentTypeId) || documentTypeId <= 0) throw new BadRequestError("Document type is invalid.")
  if (!Array.isArray(allowedFileTypes) || allowedFileTypes.length === 0) throw new BadRequestError("At least one allowed file type is required.")
  if (maxSizeBytes != null && (!Number.isSafeInteger(Number(maxSizeBytes)) || Number(maxSizeBytes) <= 0)) throw new BadRequestError("Maximum file size is invalid.")
  assertCondition(condition)
  if (fieldKey != null && fieldKeys && !fieldKeys.has(fieldKey)) throw new BadRequestError(`Referenced form field '${fieldKey}' does not exist.`)
  const types = allowedFileTypes.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
  if (!types.length) throw new BadRequestError("At least one allowed file type is required.")
  const allowedSources = ["CLIENT", "STAFF", "SYSTEM", "EXTERNAL"]
  if (!allowedSources.includes(source)) throw new BadRequestError(`Unsupported document requirement source '${source}'.`)
  return { name: name.trim(), documentTypeId, required, allowedFileTypes: types, maxSizeBytes, condition, source, fieldKey, sortOrder }
}

const getParentVersion = async ({ formVersionId = null, workflowVersionId = null }) => {
  if ((formVersionId && workflowVersionId) || (!formVersionId && !workflowVersionId)) throw new BadRequestError("Exactly one parent version is required.")
  if (formVersionId) { const version = await prisma.formVersion.findUnique({ where: { id: formVersionId }, include: { fields: { select: { key: true } } } }); if (!version) throw new NotFoundError("Form version was not found."); return { kind: "form", version, fieldKeys: new Set(version.fields.map((field) => field.key)) } }
  const version = await prisma.workflowVersion.findUnique({ where: { id: workflowVersionId }, include: { steps: { select: { key: true } } } }); if (!version) throw new NotFoundError("Workflow version was not found."); return { kind: "workflow", version, fieldKeys: null }
}
const assertDraft = (version) => { if (version.status !== "DRAFT") throw new ConflictError("Published or archived configurations are immutable.") }
const createRequirement = async ({ formVersionId = null, workflowVersionId = null, ...input }) => { const parent = await getParentVersion({ formVersionId, workflowVersionId }); assertDraft(parent.version); const data = validateRequirementDefinition(input, parent.fieldKeys); return prisma.documentRequirement.create({ data: { ...data, formVersionId, workflowVersionId } }) }
const updateRequirement = async ({ id, ...input }) => { const existing = await prisma.documentRequirement.findUnique({ where: { id } }); if (!existing) throw new NotFoundError("Document requirement was not found."); const parent = await getParentVersion({ formVersionId: existing.formVersionId, workflowVersionId: existing.workflowVersionId }); assertDraft(parent.version); const data = validateRequirementDefinition({ ...existing, ...input }, parent.fieldKeys); return prisma.documentRequirement.update({ where: { id }, data }) }
const deleteRequirement = async ({ id }) => { const existing = await prisma.documentRequirement.findUnique({ where: { id } }); if (!existing) throw new NotFoundError("Document requirement was not found."); const parent = await getParentVersion({ formVersionId: existing.formVersionId, workflowVersionId: existing.workflowVersionId }); assertDraft(parent.version); return prisma.documentRequirement.delete({ where: { id } }) }
const validateUploadedFile = ({ requirement, mimeType, extension, sizeBytes }) => { if (!requirement || !Array.isArray(requirement.allowedFileTypes)) throw new BadRequestError("Invalid document requirement."); if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new BadRequestError("File size is invalid."); if (requirement.maxSizeBytes != null && sizeBytes > Number(requirement.maxSizeBytes)) throw new BadRequestError("File exceeds the maximum allowed size."); const normalizedMime = typeof mimeType === "string" ? mimeType.trim().toLowerCase() : ""; const normalizedExtension = typeof extension === "string" ? (extension.startsWith(".") ? extension : `.${extension}`).toLowerCase() : ""; const allowed = requirement.allowedFileTypes.map((item) => String(item).toLowerCase()); const accepted = allowed.some((type) => type === normalizedMime || type === normalizedExtension || (type.endsWith("/*") && normalizedMime.startsWith(type.slice(0, -1)))); if (!accepted) throw new BadRequestError("File type is not allowed for this requirement."); return true }
module.exports = { validateRequirementDefinition, assertCondition, createRequirement, updateRequirement, deleteRequirement, validateUploadedFile, getParentVersion }
