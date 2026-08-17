const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError } = require("../../common/errors/appError")
const { recordAudit } = require("../audit/audit.service")

const getPathValue = (value, path) => path?.split(".").reduce((current, part) => current?.[part], value)

const compare = (actual, operator, expected) => {
  switch (operator) {
    case "equals": return actual === expected
    case "not_equals": return actual !== expected
    case "greater_than": return typeof actual === "number" && actual > Number(expected)
    case "greater_or_equal": return typeof actual === "number" && actual >= Number(expected)
    case "less_than": return typeof actual === "number" && actual < Number(expected)
    case "less_or_equal": return typeof actual === "number" && actual <= Number(expected)
    case "in": return Array.isArray(expected) && expected.includes(actual)
    case "not_in": return Array.isArray(expected) && !expected.includes(actual)
    case "contains": return typeof actual === "string" && actual.includes(String(expected))
    case "is_empty": return actual == null || actual === "" || (Array.isArray(actual) && actual.length === 0)
    case "is_not_empty": return !compare(actual, "is_empty")
    default: return false
  }
}

const evaluateCondition = (condition, context) => {
  if (!condition) return true
  if (Array.isArray(condition.all)) return condition.all.every((item) => evaluateCondition(item, context))
  if (Array.isArray(condition.any)) return condition.any.some((item) => evaluateCondition(item, context))
  if (condition.not) return !evaluateCondition(condition.not, context)
  if (!condition.field || !condition.operator) throw new BadRequestError("Invalid business rule condition.")
  const actual = getPathValue(context, condition.field)
  const expected = condition.valueFrom ? getPathValue(context, condition.valueFrom) : condition.value
  return compare(actual, condition.operator, expected)
}

const evaluateRules = async ({ event, entityType = null, context = {} }) => {
  const rules = await prisma.businessRule.findMany({
    where: { event, active: true, ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}) },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })
  return rules.filter((rule) => evaluateCondition(rule.conditions, context)).map((rule) => ({ ...rule, matched: true }))
}

const createRule = async ({ key, name, description = null, event, entityType = null, priority = 100, conditions, actions, actorId = null }) => {
  if (!key || !name || !event || !Array.isArray(actions) || !conditions) throw new BadRequestError("Rule key, name, event, conditions, and actions are required.")
  const rule = await prisma.businessRule.create({ data: { key, name, description, event, entityType, priority, conditions, actions } })
  await recordAudit({ actorId, action: "BUSINESS_RULE_CREATED", entityType: "BusinessRule", entityId: rule.id, after: rule })
  return rule
}

module.exports = { getPathValue, compare, evaluateCondition, evaluateRules, createRule }
