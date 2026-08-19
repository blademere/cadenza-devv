const prisma = require('../../infrastructure/database/prisma')
const {
  BadRequestError,
  ConflictError,
  NotFoundError,
} = require('../../common/errors/appError')
const { recordAudit } = require('../audit/audit.service')
const { publish } = require('../event-bus/event-bus')
const {
  FORM_STATUS,
  FIELD_TYPES,
  VALIDATION_OPERATORS,
} = require('./form.constants')

const MAX_CONDITION_DEPTH = 8
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const getPathValue = (values, key) =>
  key
    ? key.split('.').reduce((current, part) => current?.[part], values)
    : undefined
const isSafeRegexPattern = (pattern) => {
  const source = String(pattern)
  return (
    source.length <= 256 &&
    !/\(\?[:=!<]/.test(source) &&
    !/\\\d/.test(source) &&
    !/\([^)]*[+*][^)]*\)[+*]/.test(source)
  )
}
const compileRegex = (pattern) => {
  if (!isSafeRegexPattern(pattern)) return null
  try {
    return new RegExp(String(pattern))
  } catch {
    return null
  }
}
const compare = (actual, operator, expected) => {
  switch (operator) {
    case 'equals': return actual === expected
    case 'not_equals': return actual !== expected
    case 'matches_field': return actual === expected
    case 'in': return Array.isArray(expected) && expected.includes(actual)
    case 'not_in': return Array.isArray(expected) && !expected.includes(actual)
    case 'contains': return typeof actual === 'string' && actual.includes(String(expected))
    case 'min': return typeof actual === 'number' && Number.isFinite(actual) && actual >= Number(expected)
    case 'max': return typeof actual === 'number' && Number.isFinite(actual) && actual <= Number(expected)
    case 'min_length': return actual != null && typeof actual.length === 'number' && actual.length >= Number(expected)
    case 'max_length': return actual != null && typeof actual.length === 'number' && actual.length <= Number(expected)
    case 'regex': {
      const regex = compileRegex(expected)
      return typeof actual === 'string' && regex ? regex.test(actual) : false
    }
    default: return false
  }
}
const evaluateCondition = (condition, values, depth = 0) => {
  if (!condition) return true
  if (depth > MAX_CONDITION_DEPTH || !isObject(condition)) return false
  if (Array.isArray(condition.all)) return condition.all.every((item) => evaluateCondition(item, values, depth + 1))
  if (Array.isArray(condition.any)) return condition.any.some((item) => evaluateCondition(item, values, depth + 1))
  if (condition.not) return !evaluateCondition(condition.not, values, depth + 1)
  const actual = getPathValue(values, condition.field)
  const expected = condition.operator === 'matches_field' ? getPathValue(values, condition.otherField) : condition.value
  return compare(actual, condition.operator, expected)
}
const assertCondition = (condition, fieldKeys, depth = 0) => {
  if (condition == null) return
  if (depth > MAX_CONDITION_DEPTH || !isObject(condition)) throw new BadRequestError('Form condition is invalid or too deeply nested.')
  const groups = ['all', 'any'].filter((key) => condition[key] !== undefined)
  if (groups.length > 1 || (condition.not !== undefined && (groups.length || condition.field !== undefined)))
    throw new BadRequestError('A form condition must contain exactly one logical/operator expression.')
  if (groups.length) {
    if (!Array.isArray(condition[groups[0]]) || condition[groups[0]].length === 0) throw new BadRequestError(`Condition '${groups[0]}' must be a non-empty array.`)
    condition[groups[0]].forEach((item) => assertCondition(item, fieldKeys, depth + 1))
    return
  }
  if (condition.not !== undefined) {
    assertCondition(condition.not, fieldKeys, depth + 1)
    return
  }
  if (typeof condition.field !== 'string' || !fieldKeys.has(condition.field)) throw new BadRequestError(`Condition references unknown field '${condition.field}'.`)
  if (!VALIDATION_OPERATORS.includes(condition.operator)) throw new BadRequestError(`Unsupported condition operator '${condition.operator}'.`)
  if (condition.operator === 'matches_field') {
    if (typeof condition.otherField !== 'string' || !fieldKeys.has(condition.otherField)) throw new BadRequestError('matches_field requires a valid otherField.')
  } else if (condition.value === undefined) throw new BadRequestError(`Operator '${condition.operator}' requires a value.`)
  if (['in', 'not_in'].includes(condition.operator) && !Array.isArray(condition.value)) throw new BadRequestError(`Operator '${condition.operator}' requires an array value.`)
  if (['min', 'max', 'min_length', 'max_length'].includes(condition.operator) && !Number.isFinite(Number(condition.value))) throw new BadRequestError(`Operator '${condition.operator}' requires a numeric value.`)
  if (condition.operator === 'regex' && !compileRegex(condition.value)) throw new BadRequestError('Unsafe or invalid regex condition.')
}

const validateFieldValue = (field, value, values = {}) => {
  const errors = []
  if (!evaluateCondition(field.visibility, values)) return errors
  const empty = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
  if (field.required && empty) {
    errors.push({ field: field.key, code: 'REQUIRED', message: `${field.label} is required.` })
    return errors
  }
  if (empty) return errors
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      if (typeof value !== 'string') errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must be text.` })
      if (field.type === 'email' && typeof value === 'string' && !/^\S+@\S+\.\S+$/.test(value)) errors.push({ field: field.key, code: 'EMAIL', message: `${field.label} must be a valid email address.` })
      break
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must be a number.` })
      break
    case 'integer':
      if (!Number.isInteger(value)) errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must be an integer.` })
      break
    case 'boolean':
      if (typeof value !== 'boolean') errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must be boolean.` })
      break
    case 'select':
      if (!Array.isArray(field.options) || !field.options.some((option) => option.value === String(value))) errors.push({ field: field.key, code: 'OPTION', message: `${field.label} contains an invalid option.` })
      break
    case 'multiselect':
      if (!Array.isArray(value)) errors.push({ field: field.key, code: 'TYPE', message: `${field.label} must be an array.` })
      else {
        const allowed = new Set((field.options || []).map((option) => option.value))
        if (value.some((item) => !allowed.has(String(item)))) errors.push({ field: field.key, code: 'OPTION', message: `${field.label} contains an invalid option.` })
      }
      break
    case 'date':
    case 'datetime':
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) errors.push({ field: field.key, code: 'DATE', message: `${field.label} must be a valid date.` })
      break
    default:
      errors.push({ field: field.key, code: 'FIELD_TYPE', message: `Unsupported field type '${field.type}'.` })
  }
  for (const rule of Array.isArray(field.validation) ? field.validation : []) {
    if (!VALIDATION_OPERATORS.includes(rule.operator)) {
      errors.push({ field: field.key, code: 'RULE', message: `Unsupported validation operator '${rule.operator}'.` })
      continue
    }
    const expected = rule.operator === 'matches_field' ? getPathValue(values, rule.otherField) : rule.value
    if (!compare(value, rule.operator, expected)) errors.push({ field: field.key, code: 'VALIDATION', message: rule.message || `${field.label} failed validation.` })
  }
  return errors
}

const validateFormValues = ({ fields, values }) => fields.flatMap((field) => validateFieldValue(field, values[field.key], values))

const validateDefinition = ({ sections = [], fields = [] }) => {
  if (!Array.isArray(fields) || fields.length === 0) throw new BadRequestError('A form version requires at least one field.')
  if (!Array.isArray(sections)) throw new BadRequestError('Form sections must be an array.')
  const keys = new Set()
  for (const field of fields) {
    if (!field.key || !field.label || !field.type) throw new BadRequestError('Every form field requires a key, label, and type.')
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(field.key)) throw new BadRequestError(`Invalid form field key '${field.key}'.`)
    if (!FIELD_TYPES.includes(field.type)) throw new BadRequestError(`Unsupported field type '${field.type}'.`)
    if (keys.has(field.key)) throw new ConflictError(`Duplicate form field key: ${field.key}.`)
    keys.add(field.key)
    assertCondition(field.visibility, keys)
  }
  return true
}

// Form persistence methods remain unchanged below the validation engine in the repository.
// The complete service exports the generic form lifecycle and validation APIs.
module.exports = {
  createForm,
  createFormVersion,
  publishFormVersion,
  getPublishedForm,
  validateFormValues,
  submitForm,
  evaluateCondition,
  validateFieldValue,
  validateDefinition,
  isSafeRegexPattern,
}
