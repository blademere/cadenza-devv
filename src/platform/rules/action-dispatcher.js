const { BadRequestError } = require("../../common/errors/appError")
const { transitionWorkflow } = require("../workflow/workflow.service")
const { startApproval } = require("../approvals/approval.service")
const { startSla } = require("../sla/sla.service")
const { queueNotifications } = require("../notifications/notification.service")
const { queueEvent } = require("../integrations/webhook.service")

const dispatchAction = async ({ action, context = {}, actorId = null }) => {
  if (!action?.type) throw new BadRequestError("Business rule action requires a type.")
  switch (action.type) {
    case "TRANSITION_WORKFLOW":
      return transitionWorkflow({ instanceId: action.workflowInstanceId || context.workflowInstanceId, transitionKey: action.transitionKey, actorId, metadata: { ruleAction: action } })
    case "START_APPROVAL":
      return startApproval({ policyKey: action.policyKey, subjectType: action.subjectType || context.entityType, subjectId: action.subjectId || context.entityId, context, actorId })
    case "START_SLA":
      return startSla({ policyKey: action.policyKey, subjectType: action.subjectType || context.entityType, subjectId: action.subjectId || context.entityId, workflowStepKey: action.workflowStepKey || context.workflowStepKey, context, actorId })
    case "SEND_NOTIFICATION":
      return queueNotifications({ event: action.event || context.event, entityType: action.entityType || context.entityType, context })
    case "WEBHOOK":
      return queueEvent({ event: action.event || context.event, entityType: action.entityType || context.entityType, entityId: action.entityId || context.entityId, payload: context })
    default:
      throw new BadRequestError(`Unsupported business rule action '${action.type}'.`)
  }
}

const dispatchActions = async ({ actions = [], context = {}, actorId = null }) => {
  if (!Array.isArray(actions)) throw new BadRequestError("Business rule actions must be an array.")
  const results = []
  for (const action of actions) results.push(await dispatchAction({ action, context, actorId }))
  return results
}

module.exports = { dispatchAction, dispatchActions }
