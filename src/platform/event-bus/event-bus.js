const { randomUUID } = require("node:crypto")
const { recordAudit } = require("../audit/audit.service")
const { evaluateRules } = require("../rules/rule.service")
const { dispatchActions } = require("../rules/action-dispatcher")
const { queueNotifications } = require("../notifications/notification.service")
const { queueEvent: queueWebhookEvent } = require("../integrations/webhook.service")
const { findApplicablePolicy: findApprovalPolicy, startApproval } = require("../approvals/approval.service")
const { findApplicablePolicy: findSlaPolicy, startSla } = require("../sla/sla.service")
const { enqueueEvent, MAX_EVENT_DEPTH } = require("./event-outbox.service")

const buildEnvelope = ({ event, entityType = null, entityId = null, actorId = null, context = {}, correlationId = randomUUID(), causationId = null, depth = 0 }) => {
  if (!event) throw new Error("event is required")
  if (depth > MAX_EVENT_DEPTH) throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)
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
  const idempotencyKey = options.idempotencyKey || `${envelope.event}:${envelope.entityType || "platform"}:${envelope.entityId || "none"}:${envelope.correlationId}`
  return enqueueEvent({ db: options.db, ...envelope, idempotencyKey })
}

const processEvent = async (envelope) => {
  const { event, entityType, entityId, actorId, context = {}, correlationId, causationId, depth = 0 } = envelope
  if (depth > MAX_EVENT_DEPTH) throw new Error(`Maximum event depth of ${MAX_EVENT_DEPTH} exceeded.`)
  const eventContext = { ...context, event, entityType, entityId, correlationId, causationId, depth }

  await recordAudit({ actorId, action: `EVENT_${event.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, entityType: entityType || "PlatformEvent", entityId: entityId || event, metadata: envelope })

  const [rules, notifications, approvalPolicy, slaPolicy] = await Promise.all([
    evaluateRules({ event, entityType, context: eventContext }),
    queueNotifications({ event, entityType, context: eventContext }),
    findApprovalPolicy({ entityType, context: eventContext }),
    findSlaPolicy({ entityType, workflowStepKey: context.workflowStepKey || null, context: eventContext }),
  ])

  const ruleResults = []
  for (const rule of rules) {
    ruleResults.push({ key: rule.key, results: await dispatchActions({ actions: rule.actions, context: eventContext, actorId }) })
  }
  if (approvalPolicy && entityId != null) await startApproval({ policyKey: approvalPolicy.key, subjectType: entityType, subjectId: entityId, context: eventContext, actorId })
  if (slaPolicy && entityId != null) await startSla({ policyKey: slaPolicy.key, subjectType: entityType, subjectId: entityId, workflowStepKey: context.workflowStepKey || null, context: eventContext, actorId })
  if (entityId != null) await queueWebhookEvent({ event, entityType, entityId, payload: envelope })

  return { event: envelope, rules, ruleResults, notifications, approvalStarted: Boolean(approvalPolicy && entityId != null), slaStarted: Boolean(slaPolicy && entityId != null) }
}

module.exports = { publish, processEvent, buildEnvelope }
