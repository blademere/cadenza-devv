import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { BadRequestError } from '../../common/errors/appError.js'
import { recordAudit } from '../audit/audit.service.js'

const prisma = getPrismaClient()

const MAX_CONDITION_DEPTH = 20
const OPERATORS = new Set([
  'equals','not_equals','greater_than','greater_or_equal','less_than','less_or_equal','in','not_in','contains','is_empty','is_not_empty',
])
const ACTIONS = new Set(['TRANSITION_WORKFLOW','START_APPROVAL','START_SLA','SEND_NOTIFICATION','WEBHOOK'])

const getPathValue = (value, path) => path?.split('.').reduce((current, part) => current?.[part], value)
const compare = (actual, operator, expected) => {
  switch (operator) {
    case 'equals': return actual === expected
    case 'not_equals': return actual !== expected
    case 'greater_than': return typeof actual === 'number' && Number.isFinite(actual) && actual > Number(expected)
    case 'greater_or_equal': return typeof actual === 'number' && Number.isFinite(actual) && actual >= Number(expected)
    case 'less_than': return typeof actual === 'number' && Number.isFinite(actual) && actual < Number(expected)
    case 'less_or_equal': return typeof actual === 'number' && Number.isFinite(actual) && actual <= Number(expected)
    case 'in': return Array.isArray(expected) && expected.includes(actual)
    case 'not_in': return Array.isArray(expected) && !expected.includes(actual)
    case 'contains': return typeof actual === 'string' && actual.includes(String(expected))
    case 'is_empty': return actual == null || actual === '' || (Array.isArray(actual) && actual.length === 0)
    case 'is_not_empty': return !compare(actual, 'is_empty')
    default: return false
  }
}

const validateCondition = (condition, depth = 0) => {
  if (condition == null || typeof condition !== 'object' || Array.isArray(condition)) throw new BadRequestError('Business rule condition must be an object.')
  if (depth > MAX_CONDITION_DEPTH) throw new BadRequestError(`Business rule condition depth cannot exceed ${MAX_CONDITION_DEPTH}.`)
  const keys = Object.keys(condition)
  if (Array.isArray(condition.all) || Array.isArray(condition.any)) {
    const group = Array.isArray(condition.all) ? 'all' : 'any'
    if (keys.some((key) => key !== group) || condition[group].length === 0) throw new BadRequestError(`${group} condition must contain only a non-empty child condition array.`)
    condition[group].forEach((child) => validateCondition(child, depth + 1)); return true
  }
  if (condition.not !== undefined) { if (keys.length !== 1) throw new BadRequestError('A not condition cannot contain unrelated properties.'); return validateCondition(condition.not, depth + 1) }
  if (typeof condition.field !== 'string' || !condition.field.trim()) throw new BadRequestError('Business rule condition requires a non-empty field path.')
  if (!OPERATORS.has(condition.operator)) throw new BadRequestError(`Unsupported business rule operator '${condition.operator}'.`)
  if (condition.valueFrom !== undefined && (typeof condition.valueFrom !== 'string' || !condition.valueFrom.trim())) throw new BadRequestError('condition.valueFrom must be a non-empty field path.')
  if (condition.valueFrom !== undefined && condition.value !== undefined) throw new BadRequestError('A condition cannot specify both value and valueFrom.')
  if (!['is_empty', 'is_not_empty'].includes(condition.operator) && condition.valueFrom === undefined && condition.value === undefined) throw new BadRequestError(`Operator '${condition.operator}' requires value or valueFrom.`)
  return true
}

const validateAction = (action) => {
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new BadRequestError('Business rule action must be an object.')
  if (!ACTIONS.has(action.type)) throw new BadRequestError(`Unsupported business rule action '${action.type}'.`)
  const required = { TRANSITION_WORKFLOW: ['transitionKey'], START_APPROVAL: ['policyKey'], START_SLA: ['policyKey'], SEND_NOTIFICATION: [], WEBHOOK: [] }[action.type]
  for (const key of required) if (typeof action[key] !== 'string' || !action[key].trim()) throw new BadRequestError(`${action.type} requires '${key}'.`)
  return true
}
const validateRuleDefinition = ({ event, conditions, actions }) => { if (typeof event !== 'string' || !event.trim()) throw new BadRequestError('Rule event must be a non-empty string.'); validateCondition(conditions); if (!Array.isArray(actions) || actions.length === 0) throw new BadRequestError('Business rule must contain at least one action.'); actions.forEach(validateAction); return true }
const evaluateCondition = (condition, context, depth = 0) => {
  if (condition == null) return true
  if (depth > MAX_CONDITION_DEPTH) throw new BadRequestError(`Business rule condition depth cannot exceed ${MAX_CONDITION_DEPTH}.`)
  if (Array.isArray(condition.all)) return condition.all.every((item) => evaluateCondition(item, context, depth + 1))
  if (Array.isArray(condition.any)) return condition.any.some((item) => evaluateCondition(item, context, depth + 1))
  if (condition.not !== undefined) return !evaluateCondition(condition.not, context, depth + 1)
  if (!OPERATORS.has(condition.operator)) throw new BadRequestError(`Unsupported business rule operator '${condition.operator}'.`)
  const actual = getPathValue(context, condition.field); const expected = condition.valueFrom ? getPathValue(context, condition.valueFrom) : condition.value
  return compare(actual, condition.operator, expected)
}
const evaluateRules = async ({ event, entityType = null, context = {} }) => {
  if (typeof event !== 'string' || !event.trim()) throw new BadRequestError('Rule event must be a non-empty string.')
  const rules = await prisma.businessRule.findMany({ where: { event, active: true, ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}) }, orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] })
  return rules.filter((rule) => evaluateCondition(rule.conditions, context)).map((rule) => ({ ...rule, matched: true }))
}
const createRule = async ({ key, name, description = null, event, entityType = null, priority = 100, conditions, actions, actorId = null }) => {
  if (!key || !name || !event || !conditions) throw new BadRequestError('Rule key, name, event, and conditions are required.')
  if (!Number.isInteger(priority)) throw new BadRequestError('Rule priority must be an integer.')
  validateRuleDefinition({ event, conditions, actions })
  const rule = await prisma.businessRule.create({ data: { key, name, description, event, entityType, priority, conditions, actions } })
  await recordAudit({ actorId, action: 'BUSINESS_RULE_CREATED', entityType: 'BusinessRule', entityId: rule.id, after: rule })
  return rule
}

export { getPathValue, compare, validateCondition, validateAction, validateRuleDefinition, evaluateCondition, evaluateRules, createRule }
