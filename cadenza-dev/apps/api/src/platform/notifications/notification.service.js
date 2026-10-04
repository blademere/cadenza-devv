import crypto from 'node:crypto'
import { BadRequestError, NotFoundError } from '../../common/errors/appError.js'
import { evaluateCondition, getPathValue } from '../rules/rule.service.js'
import { recordAudit } from '../audit/audit.service.js'
import { enqueueJob as defaultEnqueueJob } from '../jobs/job.service.js'
import { JOB_NAMES, JOB_QUEUES } from '../jobs/job.constants.js'
import { NOTIFICATION_CHANNELS } from './notification.constants.js'
import {
  parsePermission,
  normalizeChannel,
  validateTemplateChannel,
  validateRecipientType,
  validateRecipientValue,
  validatePriority,
} from './notification.validation.js'
import * as repository from './notification.repository.js'

const DELIVERY_STATUS = Object.freeze({ QUEUED: 'QUEUED', PROCESSING: 'PROCESSING', SENT: 'SENT', FAILED: 'FAILED', DEAD: 'DEAD' })
const MAX_ATTEMPTS = 5
const MAX_ERROR_LENGTH = 2000
const render = (template, context) => String(template || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
  const value = getPathValue(context, path.trim())
  return value == null ? '' : String(value)
})
const stableIdempotencyKey = ({ correlationId, event, ruleId, recipient, templateId }) =>
  crypto.createHash('sha256').update(JSON.stringify([correlationId || null, event, ruleId, String(recipient), templateId])).digest('hex')

const createNotificationTemplate = async ({ key, name, channel, subject = null, body, actorId = null }) => {
  if (!key || !name) throw new BadRequestError('Notification template key and name are required.')
  const normalizedChannel = validateTemplateChannel({ channel, subject, body })
  const template = await repository.createTemplate({ key, name, channel: normalizedChannel, subject, body })
  await recordAudit({ actorId, action: 'NOTIFICATION_TEMPLATE_CREATED', entityType: 'NotificationTemplate', entityId: template.id, after: template })
  return template
}

const createNotificationRule = async ({ key, name, event, entityType = null, conditions = {}, templateKey, recipientType, recipientValue = null, priority = 100, actorId = null }) => {
  if (!key || !name || !event) throw new BadRequestError('Notification rule key, name, and event are required.')
  validateRecipientType(recipientType)
  validateRecipientValue(recipientType, recipientValue)
  validatePriority(priority)
  const template = await repository.findTemplateByKey(templateKey)
  if (!template || !template.active) throw new NotFoundError(`Active notification template '${templateKey}' was not found.`)
  validateTemplateChannel(template)
  const rule = await repository.createRule({ key, name, event, entityType, conditions, templateId: template.id, recipientType, recipientValue, priority })
  await recordAudit({ actorId, action: 'NOTIFICATION_RULE_CREATED', entityType: 'NotificationRule', entityId: rule.id, after: rule })
  return rule
}

const resolveRecipients = async (rule, context, db) => {
  validateRecipientType(rule.recipientType)
  if (rule.recipientType === 'STATIC') return rule.recipientValue ? [String(rule.recipientValue).trim()] : []
  if (rule.recipientType === 'FIELD') {
    const value = getPathValue(context, rule.recipientValue)
    return value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)]
  }
  if (rule.recipientType === 'USER') {
    const value = context.user?.id || context.user?.email
    return value == null ? [] : [String(value)]
  }
  if (rule.recipientType === 'ROLE') {
    const users = await repository.findActiveUsersByRole(rule.recipientValue, db)
    return users.map((user) => user.email).filter(Boolean)
  }
  const { resource, action } = parsePermission(rule.recipientValue)
  const users = await repository.findActiveUsersByPermission({ action, resource }, db)
  return users.map((user) => user.email).filter(Boolean)
}

const resolvePreferredDelivery = async ({ channel, recipient, db }) => {
  const normalizedChannel = normalizeChannel(channel)
  if (normalizedChannel === NOTIFICATION_CHANNELS.IN_APP) return { channel: normalizedChannel, recipient: String(recipient), enabled: true }
  const numericUserId = Number(recipient)
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) return { channel: normalizedChannel, recipient: String(recipient), enabled: true }
  const user = await repository.findUserNotificationProfile(numericUserId, db)
  if (!user || !user.isActive) return { channel: normalizedChannel, recipient: String(recipient), enabled: false }
  const preference = user.notificationPreferences.find((item) => item.channel === normalizedChannel)
  if (!preference?.enabled) return { channel: normalizedChannel, recipient: String(recipient), enabled: false }
  const destination = preference.destination || (normalizedChannel === NOTIFICATION_CHANNELS.EMAIL ? user.email : null)
  if (!destination) return { channel: normalizedChannel, recipient: String(recipient), enabled: false }
  return { channel: normalizedChannel, recipient: destination, enabled: true }
}

const computeRetryAt = (attempt) => new Date(Date.now() + Math.min(3600, 2 ** Math.max(0, attempt - 1) * 30) * 1000)
const sanitizeError = (error) => String(error?.message || error || 'Notification delivery failed').slice(0, MAX_ERROR_LENGTH)

const claimDelivery = async ({ id, now = new Date() }, db) => {
  const delivery = await repository.findDelivery(id, db)
  if (!delivery) throw new NotFoundError(`Notification delivery '${id}' was not found.`)
  if ([DELIVERY_STATUS.SENT, DELIVERY_STATUS.DEAD, DELIVERY_STATUS.PROCESSING].includes(delivery.status)) return { claimed: false, delivery }
  if (delivery.status === DELIVERY_STATUS.FAILED && delivery.nextAttemptAt && delivery.nextAttemptAt > now) return { claimed: false, delivery }
  const claimed = await repository.claimDelivery({ id, status: delivery.status, updatedAt: delivery.updatedAt }, { status: DELIVERY_STATUS.PROCESSING, error: null }, db)
  if (claimed.count !== 1) return { claimed: false, delivery: await repository.findDelivery(id, db) }
  return { claimed: true, delivery: await repository.findDelivery(id, db) }
}

const markDeliverySent = async (id, db) => repository.updateDelivery({ id, status: DELIVERY_STATUS.PROCESSING }, { status: DELIVERY_STATUS.SENT, sentAt: new Date(), failedAt: null, error: null }, db)

const markDeliveryFailed = async (id, error, db) => {
  const delivery = await repository.findDelivery(id, db)
  if (!delivery) throw new NotFoundError(`Notification delivery '${id}' was not found.`)
  if (delivery.status === DELIVERY_STATUS.SENT || delivery.status === DELIVERY_STATUS.DEAD) return delivery
  const attempt = Number(delivery.attempts || 0) + 1
  const terminal = attempt >= MAX_ATTEMPTS
  return repository.updateDelivery({ id }, { status: terminal ? DELIVERY_STATUS.DEAD : DELIVERY_STATUS.FAILED, failedAt: new Date(), error: sanitizeError(error), attempts: attempt, nextAttemptAt: terminal ? null : computeRetryAt(attempt) }, db)
}

const queueNotifications = async ({ event, entityType = null, context = {}, db, enqueue = defaultEnqueueJob }) => {
  if (!event) throw new BadRequestError('Notification event is required.')
  const rules = await repository.findRulesForEvent({ event, entityType }, db)
  const deliveries = []
  for (const rule of rules) {
    if (!evaluateCondition(rule.conditions, context)) continue
    const channel = validateTemplateChannel(rule.template)
    const subject = render(rule.template.subject, context)
    const body = render(rule.template.body, context)
    const recipients = [...new Set((await resolveRecipients(rule, context, db)).map((item) => String(item).trim()).filter(Boolean))]
    for (const originalRecipient of recipients) {
      const preferred = await resolvePreferredDelivery({ channel, recipient: originalRecipient, db })
      if (!preferred.enabled) continue
      const recipient = preferred.recipient
      const idempotencyKey = stableIdempotencyKey({ correlationId: context.correlationId, event, ruleId: rule.id, recipient, templateId: rule.templateId })
      const delivery = await repository.transaction(async (tx) => {
        let notificationId = null
        if (channel === NOTIFICATION_CHANNELS.IN_APP) {
          const userId = Number(originalRecipient)
          if (!Number.isInteger(userId) || userId <= 0) throw new BadRequestError(`In-app notification recipient '${originalRecipient}' is not a valid user id.`)
          const notification = await repository.upsertInAppNotification(
            { idempotencyKey: `${idempotencyKey}:in-app` },
            { userId, type: event, title: subject || rule.template.name, message: body, data: context, idempotencyKey: `${idempotencyKey}:in-app` },
            tx,
          )
          notificationId = notification.id
        }
        return repository.upsertDelivery({ where: { idempotencyKey }, create: { idempotencyKey, ruleId: rule.id, templateId: rule.templateId, notificationId, recipient, channel, status: channel === NOTIFICATION_CHANNELS.IN_APP ? DELIVERY_STATUS.SENT : DELIVERY_STATUS.QUEUED, payload: { subject, body, context } }, update: notificationId ? { notificationId } : {} }, tx)
      }, db)
      if (channel !== NOTIFICATION_CHANNELS.IN_APP && delivery.status === DELIVERY_STATUS.QUEUED)
        await enqueue({ queue: JOB_QUEUES.NOTIFICATIONS, name: JOB_NAMES.NOTIFICATION_DELIVERY, data: { deliveryId: delivery.id }, jobId: `notification-delivery-${delivery.id}` })
      deliveries.push(delivery)
    }
  }
  return deliveries
}

export { render, createNotificationTemplate, createNotificationRule, queueNotifications, resolveRecipients, resolvePreferredDelivery, stableIdempotencyKey, claimDelivery, markDeliverySent, markDeliveryFailed, validateTemplateChannel, normalizeChannel, computeRetryAt, DELIVERY_STATUS, MAX_ATTEMPTS }
