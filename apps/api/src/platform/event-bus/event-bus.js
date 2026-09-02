import { randomUUID } from 'node:crypto'
import { recordAudit } from '../audit/audit.service.js'
import { evaluateRules } from '../rules/rule.service.js'
import { dispatchActions } from '../rules/action-dispatcher.js'
import { queueNotifications } from '../notifications/notification.service.js'
import { enqueueEvent, MAX_EVENT_DEPTH } from './event-outbox.service.js'

const buildEnvelope = ({
  event,
  entityType = null,
  entityId = null,
  actorId = null,
  context = {},
  correlationId = randomUUID(),
  causationId = null,
  depth = 0,
}) => {
  if (!event) throw new Error('event is required')
  if (depth > MAX_EVENT_DEPTH)
    throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)

  return {
    event,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    actorId,
    context,
    correlationId,
    causationId,
    depth,
    occurredAt: new Date().toISOString(),
  }
}

const publish = async (options = {}) => {
  const envelope = buildEnvelope(options)
  const idempotencyKey =
    options.idempotencyKey ||
    `${envelope.event}:${envelope.entityType || 'platform'}:${envelope.entityId || 'none'}:${envelope.correlationId}`

  return enqueueEvent({ db: options.db, ...envelope, idempotencyKey })
}

const processEvent = async (envelope) => {
  const {
    event,
    entityType,
    entityId,
    actorId,
    context = {},
    correlationId,
    causationId,
    depth = 0,
  } = envelope

  if (depth > MAX_EVENT_DEPTH)
    throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)

  const eventContext = {
    ...context,
    event,
    entityType,
    entityId,
    correlationId,
    causationId,
    depth,
  }

  if (entityId != null) {
    await recordAudit({
      actorId,
      action: `EVENT_${event.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`,
      entityType: entityType || 'PlatformEvent',
      entityId,
      metadata: envelope,
    })
  }

  const [rules, notifications] = await Promise.all([
    evaluateRules({ event, entityType, context: eventContext }),
    queueNotifications({ event, entityType, context: eventContext }),
  ])

  const ruleResults = []
  for (const rule of rules) {
    ruleResults.push({
      key: rule.key,
      results: await dispatchActions({
        actions: rule.actions,
        context: eventContext,
        actorId,
        ruleId: rule.id || rule.key,
        causationId,
      }),
    })
  }

  return {
    event: envelope,
    rules,
    ruleResults,
    notifications,
  }
}

export { publish, processEvent, buildEnvelope }
