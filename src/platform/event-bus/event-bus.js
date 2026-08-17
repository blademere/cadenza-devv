const { recordAudit } = require("../audit/audit.service")
const { evaluateRules } = require("../rules/rule.service")
const { queueNotifications } = require("../notifications/notification.service")
const { queueEvent: queueWebhookEvent } = require("../integrations/webhook.service")
const { findApplicablePolicy: findApprovalPolicy, startApproval } = require("../approvals/approval.service")
const { findApplicablePolicy: findSlaPolicy, startSla } = require("../sla/sla.service")

const publish = async ({ event, entityType = null, entityId = null, actorId = null, context = {} }) => {
  if (!event) throw new Error("event is required")
  const envelope = { event, entityType, entityId: entityId == null ? null : String(entityId), actorId, context, occurredAt: new Date().toISOString() }

  await recordAudit({ actorId, action: `EVENT_${event.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`, entityType: entityType || "PlatformEvent", entityId: envelope.entityId || event, metadata: envelope })

  const [rules, notifications, approvalPolicy, slaPolicy] = await Promise.all([
    evaluateRules({ event, entityType, context }),
    queueNotifications({ event, entityType, context }),
    findApprovalPolicy({ entityType, context }),
    findSlaPolicy({ entityType, workflowStepKey: context.workflowStepKey || null, context }),
  ])

  if (approvalPolicy && entityId != null) await startApproval({ policyKey: approvalPolicy.key, subjectType: entityType, subjectId: entityId, context, actorId })
  if (slaPolicy && entityId != null) await startSla({ policyKey: slaPolicy.key, subjectType: entityType, subjectId: entityId, workflowStepKey: context.workflowStepKey || null, context, actorId })
  if (entityId != null) await queueWebhookEvent({ event, entityType, entityId, payload: envelope })

  return { event: envelope, rules, notifications, approvalStarted: Boolean(approvalPolicy && entityId != null), slaStarted: Boolean(slaPolicy && entityId != null) }
}

module.exports = { publish }
