const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, NotFoundError } = require("../../common/errors/appError")
const { evaluateCondition, getPathValue } = require("../rules/rule.service")
const { recordAudit } = require("../audit/audit.service")

const render = (template, context) => String(template || "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => { const value = getPathValue(context, path.trim()); return value == null ? "" : String(value) })
const parsePermission = (key) => { const index = key?.indexOf("."); if (!key || index <= 0 || index === key.length - 1) throw new BadRequestError(`Invalid permission key '${key}'.`); return { resource: key.slice(0, index), action: key.slice(index + 1) } }

const createNotificationTemplate = async ({ key, name, channel, subject = null, body, actorId = null }) => {
  if (!key || !name || !channel || !body) throw new BadRequestError("Notification template requires key, name, channel, and body.")
  const template = await prisma.notificationTemplate.create({ data: { key, name, channel, subject, body } })
  await recordAudit({ actorId, action: "NOTIFICATION_TEMPLATE_CREATED", entityType: "NotificationTemplate", entityId: template.id, after: template })
  return template
}

const createNotificationRule = async ({ key, name, event, entityType = null, conditions = {}, templateKey, recipientType, recipientValue = null, priority = 100, actorId = null }) => {
  if (!recipientType) throw new BadRequestError("Notification recipient type is required.")
  const template = await prisma.notificationTemplate.findUnique({ where: { key: templateKey } })
  if (!template) throw new NotFoundError(`Notification template '${templateKey}' was not found.`)
  const rule = await prisma.notificationRule.create({ data: { key, name, event, entityType, conditions, templateId: template.id, recipientType, recipientValue, priority } })
  await recordAudit({ actorId, action: "NOTIFICATION_RULE_CREATED", entityType: "NotificationRule", entityId: rule.id, after: rule })
  return rule
}

const resolveRecipients = async (rule, context) => {
  if (rule.recipientType === "STATIC") return rule.recipientValue ? [String(rule.recipientValue)] : []
  if (rule.recipientType === "FIELD") { const value = getPathValue(context, rule.recipientValue); return value == null ? [] : [String(value)] }
  if (rule.recipientType === "USER") { const value = context.user?.email || context.user?.id; return value == null ? [] : [String(value)] }
  if (rule.recipientType === "ROLE") {
    const users = await prisma.user.findMany({ where: { isActive: true, role: { name: rule.recipientValue } }, select: { email: true } })
    return users.map((user) => user.email)
  }
  if (rule.recipientType === "PERMISSION") {
    const { resource, action } = parsePermission(rule.recipientValue)
    const users = await prisma.user.findMany({ where: { isActive: true, role: { permissions: { some: { permission: { action, module: { key: resource } } } } } }, select: { email: true } })
    return users.map((user) => user.email)
  }
  throw new BadRequestError(`Unsupported notification recipient type '${rule.recipientType}'.`)
}

const queueNotifications = async ({ event, entityType = null, context = {} }) => {
  const rules = await prisma.notificationRule.findMany({ where: { event, active: true, ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}) }, include: { template: true }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] })
  const deliveries = []
  for (const rule of rules) {
    if (!evaluateCondition(rule.conditions, context)) continue
    const recipients = await resolveRecipients(rule, context)
    for (const recipient of recipients) deliveries.push(await prisma.notificationDelivery.create({ data: { ruleId: rule.id, templateId: rule.templateId, recipient, channel: rule.template.channel, status: "QUEUED", payload: { subject: render(rule.template.subject, context), body: render(rule.template.body, context), context } } }))
  }
  return deliveries
}

module.exports = { render, createNotificationTemplate, createNotificationRule, queueNotifications, resolveRecipients }
