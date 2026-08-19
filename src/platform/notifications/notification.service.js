const crypto = require('node:crypto')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const prisma = getPrismaClient()
const {
  BadRequestError,
  NotFoundError,
} = require('../../common/errors/appError')
const { evaluateCondition, getPathValue } = require('../rules/rule.service')
const { recordAudit } = require('../audit/audit.service')
const { enqueueJob } = require('../jobs/job.service')
const { JOB_NAMES, JOB_QUEUES } = require('../jobs/job.constants')
const { NOTIFICATION_CHANNEL_LIST } = require('./notification.constants')

const RECIPIENT_TYPES = Object.freeze([
  'STATIC',
  'FIELD',
  'USER',
  'ROLE',
  'PERMISSION',
])
const DELIVERY_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  DEAD: 'DEAD',
})
const MAX_ATTEMPTS = 5
const MAX_ERROR_LENGTH = 2000

const render = (template, context) =>
  String(template || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
    const value = getPathValue(context, path.trim())
    return value == null ? '' : String(value)
  })

const parsePermission = (key) => {
  const index = key?.indexOf('.')
  if (!key || index <= 0 || index === key.length - 1)
    throw new BadRequestError(`Invalid permission key '${key}'.`)
  return { resource: key.slice(0, index), action: key.slice(index + 1) }
}

const stableIdempotencyKey = ({
  correlationId,
  event,
  ruleId,
  recipient,
  templateId,
}) =>
  crypto
    .createHash('sha256')
    .update(
      JSON.stringify([
        correlationId || null,
        event,
        ruleId,
        String(recipient),
        templateId,
      ])
    )
    .digest('hex')

const normalizeChannel = (channel) => {
  const value = String(channel || '')
    .trim()
    .toUpperCase()
  if (!NOTIFICATION_CHANNEL_LIST.includes(value))
    throw new BadRequestError(`Unsupported notification channel '${channel}'.`)
  return value
}

const validateTemplateChannel = ({ channel, subject, body }) => {
  const normalized = normalizeChannel(channel)
  if (!String(body || '').trim())
    throw new BadRequestError('Notification template body is required.')
  if (normalized === 'EMAIL' && !String(subject || '').trim())
    throw new BadRequestError('Email notification templates require a subject.')
  return normalized
}

const createNotificationTemplate = async ({
  key,
  name,
  channel,
  subject = null,
  body,
  actorId = null,
}) => {
  if (!key || !name)
    throw new BadRequestError(
      'Notification template key and name are required.'
    )
  const normalizedChannel = validateTemplateChannel({ channel, subject, body })
  const template = await prisma.notificationTemplate.create({
    data: { key, name, channel: normalizedChannel, subject, body },
  })
  await recordAudit({
    actorId,
    action: 'NOTIFICATION_TEMPLATE_CREATED',
    entityType: 'NotificationTemplate',
    entityId: template.id,
    after: template,
  })
  return template
}

const createNotificationRule = async ({
  key,
  name,
  event,
  entityType = null,
  conditions = {},
  templateKey,
  recipientType,
  recipientValue = null,
  priority = 100,
  actorId = null,
}) => {
  if (!key || !name || !event)
    throw new BadRequestError(
      'Notification rule key, name, and event are required.'
    )
  if (!RECIPIENT_TYPES.includes(recipientType))
    throw new BadRequestError(
      `Unsupported notification recipient type '${recipientType}'.`
    )
  if (
    ['STATIC', 'FIELD', 'ROLE', 'PERMISSION'].includes(recipientType) &&
    !recipientValue
  )
    throw new BadRequestError(
      `Recipient value is required for '${recipientType}'.`
    )
  if (!Number.isInteger(priority) || priority < 0)
    throw new BadRequestError(
      'Notification priority must be a non-negative integer.'
    )
  const template = await prisma.notificationTemplate.findUnique({
    where: { key: templateKey },
  })
  if (!template || !template.active)
    throw new NotFoundError(
      `Active notification template '${templateKey}' was not found.`
    )
  validateTemplateChannel(template)
  const rule = await prisma.notificationRule.create({
    data: {
      key,
      name,
      event,
      entityType,
      conditions,
      templateId: template.id,
      recipientType,
      recipientValue,
      priority,
    },
  })
  await recordAudit({
    actorId,
    action: 'NOTIFICATION_RULE_CREATED',
    entityType: 'NotificationRule',
    entityId: rule.id,
    after: rule,
  })
  return rule
}

const resolveRecipients = async (rule, context) => {
  if (!RECIPIENT_TYPES.includes(rule.recipientType))
    throw new BadRequestError(
      `Unsupported notification recipient type '${rule.recipientType}'.`
    )
  if (rule.recipientType === 'STATIC')
    return rule.recipientValue ? [String(rule.recipientValue).trim()] : []
  if (rule.recipientType === 'FIELD') {
    const value = getPathValue(context, rule.recipientValue)
    return value == null
      ? []
      : Array.isArray(value)
        ? value.map(String)
        : [String(value)]
  }
  if (rule.recipientType === 'USER') {
    const value = context.user?.id || context.user?.email
    return value == null ? [] : [String(value)]
  }
  if (rule.recipientType === 'ROLE') {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { name: rule.recipientValue } },
      select: { email: true },
    })
    return users.map((user) => user.email).filter(Boolean)
  }
  const { resource, action } = parsePermission(rule.recipientValue)
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: {
        permissions: {
          some: { permission: { action, module: { key: resource } } },
        },
      },
    },
    select: { email: true },
  })
  return users.map((user) => user.email).filter(Boolean)
}

const computeRetryAt = (attempt) =>
  new Date(
    Date.now() + Math.min(3600, 2 ** Math.max(0, attempt - 1) * 30) * 1000
  )

const sanitizeError = (error) =>
  String(error?.message || error || 'Notification delivery failed').slice(
    0,
    MAX_ERROR_LENGTH
  )

const claimDelivery = async ({ id, now = new Date() }) => {
  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id },
  })
  if (!delivery)
    throw new NotFoundError(`Notification delivery '${id}' was not found.`)
  if (
    delivery.status === DELIVERY_STATUS.SENT ||
    delivery.status === DELIVERY_STATUS.DEAD ||
    delivery.status === DELIVERY_STATUS.PROCESSING
  )
    return { claimed: false, delivery }
  if (
    delivery.status === DELIVERY_STATUS.FAILED &&
    delivery.nextAttemptAt &&
    delivery.nextAttemptAt > now
  )
    return { claimed: false, delivery }
  const claimed = await prisma.notificationDelivery.updateMany({
    where: { id, status: delivery.status, updatedAt: delivery.updatedAt },
    data: { status: DELIVERY_STATUS.PROCESSING, error: null },
  })
  if (claimed.count !== 1)
    return {
      claimed: false,
      delivery: await prisma.notificationDelivery.findUnique({ where: { id } }),
    }
  return {
    claimed: true,
    delivery: await prisma.notificationDelivery.findUnique({ where: { id } }),
  }
}

const markDeliverySent = async (id) =>
  prisma.notificationDelivery.update({
    where: { id, status: DELIVERY_STATUS.PROCESSING },
    data: {
      status: DELIVERY_STATUS.SENT,
      sentAt: new Date(),
      failedAt: null,
      error: null,
    },
  })

const markDeliveryFailed = async (id, error) => {
  const delivery = await prisma.notificationDelivery.findUnique({
    where: { id },
  })
  if (!delivery)
    throw new NotFoundError(`Notification delivery '${id}' was not found.`)
  if (
    delivery.status === DELIVERY_STATUS.SENT ||
    delivery.status === DELIVERY_STATUS.DEAD
  )
    return delivery
  const attempt = Number(delivery.attempts || 0) + 1
  const terminal = attempt >= MAX_ATTEMPTS
  return prisma.notificationDelivery.update({
    where: { id },
    data: {
      status: terminal ? DELIVERY_STATUS.DEAD : DELIVERY_STATUS.FAILED,
      failedAt: new Date(),
      error: sanitizeError(error),
      attempts: attempt,
      nextAttemptAt: terminal ? null : computeRetryAt(attempt),
    },
  })
}

const queueNotifications = async ({
  event,
  entityType = null,
  context = {},
}) => {
  if (!event) throw new BadRequestError('Notification event is required.')
  const rules = await prisma.notificationRule.findMany({
    where: {
      event,
      active: true,
      ...(entityType ? { OR: [{ entityType }, { entityType: null }] } : {}),
    },
    include: { template: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
  const deliveries = []
  for (const rule of rules) {
    if (!evaluateCondition(rule.conditions, context)) continue
    const channel = validateTemplateChannel(rule.template)
    const subject = render(rule.template.subject, context)
    const body = render(rule.template.body, context)
    const recipients = [
      ...new Set(
        (await resolveRecipients(rule, context))
          .map((item) => String(item).trim())
          .filter(Boolean)
      ),
    ]
    for (const recipient of recipients) {
      const idempotencyKey = stableIdempotencyKey({
        correlationId: context.correlationId,
        event,
        ruleId: rule.id,
        recipient,
        templateId: rule.templateId,
      })

      const delivery = await prisma.$transaction(async (tx) => {
        let notificationId = null
        if (channel === 'IN_APP') {
          const userId = Number(recipient)
          if (!Number.isInteger(userId) || userId <= 0)
            throw new BadRequestError(
              `In-app notification recipient '${recipient}' is not a valid user id.`
            )
          const notification = await tx.notification.upsert({
            where: { idempotencyKey: `${idempotencyKey}:in-app` },
            create: {
              userId,
              type: event,
              title: subject || rule.template.name,
              message: body,
              data: context,
              idempotencyKey: `${idempotencyKey}:in-app`,
            },
            update: {},
          })
          notificationId = notification.id
        }

        return tx.notificationDelivery.upsert({
          where: { idempotencyKey },
          create: {
            idempotencyKey,
            ruleId: rule.id,
            templateId: rule.templateId,
            notificationId,
            recipient,
            channel,
            status: DELIVERY_STATUS.QUEUED,
            payload: { subject, body, context },
          },
          update: notificationId ? { notificationId } : {},
        })
      })

      if (delivery.status === DELIVERY_STATUS.QUEUED) {
        await enqueueJob({
          queue: JOB_QUEUES.NOTIFICATIONS,
          name: JOB_NAMES.NOTIFICATION_DELIVERY,
          data: { deliveryId: delivery.id },
          jobId: `notification-delivery-${delivery.id}`,
        })
      }
      deliveries.push(delivery)
    }
  }
  return deliveries
}

module.exports = {
  render,
  createNotificationTemplate,
  createNotificationRule,
  queueNotifications,
  resolveRecipients,
  stableIdempotencyKey,
  claimDelivery,
  markDeliverySent,
  markDeliveryFailed,
  validateTemplateChannel,
  normalizeChannel,
  computeRetryAt,
  DELIVERY_STATUS,
  MAX_ATTEMPTS,
}
