const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")
const { recordAudit } = require("../audit/audit.service")

const TYPES = new Set(["text", "number", "integer", "boolean", "date", "datetime", "select", "multiselect", "json"])

const validateValue = (definition, value) => {
  if (value === undefined || value === null) return definition.required ? `${definition.label} is required.` : null
  switch (definition.type) {
    case "text": case "date": case "datetime":
      if (typeof value !== "string") return `${definition.label} must be text.`
      break
    case "number":
      if (typeof value !== "number" || Number.isNaN(value)) return `${definition.label} must be a number.`
      break
    case "integer":
      if (!Number.isInteger(value)) return `${definition.label} must be an integer.`
      break
    case "boolean":
      if (typeof value !== "boolean") return `${definition.label} must be boolean.`
      break
    case "select":
      if (!Array.isArray(definition.config?.options) || !definition.config.options.some((o) => String(o.value ?? o) === String(value))) return `${definition.label} contains an invalid option.`
      break
    case "multiselect":
      if (!Array.isArray(value)) return `${definition.label} must be an array.`
      if (!Array.isArray(definition.config?.options)) return `${definition.label} has no configured options.`
      if (value.some((item) => !definition.config.options.some((o) => String(o.value ?? o) === String(item)))) return `${definition.label} contains an invalid option.`
      break
    case "json":
      if (typeof value !== "object") return `${definition.label} must be JSON.`
      break
    default: return `Unsupported custom field type '${definition.type}'.`
  }
  return null
}

const defineField = async ({ entityType, key, label, description = null, type, required = false, config = null, sortOrder = 0, actorId = null }) => {
  if (!entityType || !key || !label || !type) throw new BadRequestError("entityType, key, label, and type are required.")
  if (!TYPES.has(type)) throw new BadRequestError(`Unsupported custom field type '${type}'.`)
  if (await prisma.customFieldDefinition.findUnique({ where: { entityType_key: { entityType, key } } })) throw new ConflictError(`Custom field '${entityType}.${key}' already exists.`)
  const field = await prisma.customFieldDefinition.create({ data: { entityType, key, label, description, type, required, config, sortOrder } })
  await recordAudit({ actorId, action: "CUSTOM_FIELD_DEFINED", entityType: "CustomFieldDefinition", entityId: field.id, after: field })
  return field
}

const setValue = async ({ entityType, entityId, key, value, actorId = null }) => {
  const definition = await prisma.customFieldDefinition.findUnique({ where: { entityType_key: { entityType, key } } })
  if (!definition || !definition.active) throw new NotFoundError(`Active custom field '${entityType}.${key}' was not found.`)
  const error = validateValue(definition, value)
  if (error) throw new BadRequestError(error)
  const saved = await prisma.customFieldValue.upsert({
    where: { definitionId_entityId: { definitionId: definition.id, entityId: String(entityId) } },
    create: { definitionId: definition.id, entityType, entityId: String(entityId), value },
    update: { value },
  })
  await recordAudit({ actorId, action: "CUSTOM_FIELD_VALUE_SET", entityType, entityId: String(entityId), after: { key, value } })
  return saved
}

const getValues = async ({ entityType, entityId }) => {
  const definitions = await prisma.customFieldDefinition.findMany({ where: { entityType, active: true }, orderBy: { sortOrder: "asc" } })
  const values = await prisma.customFieldValue.findMany({ where: { entityType, entityId: String(entityId) } })
  const byDefinition = new Map(values.map((item) => [item.definitionId, item.value]))
  return definitions.map((definition) => ({ key: definition.key, label: definition.label, type: definition.type, required: definition.required, value: byDefinition.get(definition.id) ?? null }))
}

const setValues = async ({ entityType, entityId, values, actorId = null }) => {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new BadRequestError("Custom field values must be an object.")
  const definitions = await prisma.customFieldDefinition.findMany({ where: { entityType, active: true } })
  const byKey = new Map(definitions.map((item) => [item.key, item]))
  for (const definition of definitions) {
    const error = validateValue(definition, values[definition.key])
    if (error) throw new BadRequestError(error)
  }
  for (const [key, value] of Object.entries(values)) {
    const definition = byKey.get(key)
    if (!definition) throw new BadRequestError(`Unknown custom field '${key}'.`)
    await setValue({ entityType, entityId, key, value, actorId })
  }
  return getValues({ entityType, entityId })
}

module.exports = { TYPES: [...TYPES], defineField, setValue, getValues, setValues, validateValue }
