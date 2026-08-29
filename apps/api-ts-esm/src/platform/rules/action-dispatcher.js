const { BadRequestError } = require('../../common/errors/appError')
const { transitionWorkflow } = require('../workflow/workflow.service')
const { startApproval } = require('../approvals/approval.service')
const { startSla } = require('../sla/sla.service')
const { queueNotifications } = require('../notifications/notification.service')
const { queueEvent } = require('../integrations/webhook.service')
const {
  claimAction,
  markSucceeded,
  markFailed,
} = require('./rule-execution.service')

const executeAction = async ({ action, context = {}, actorId = null }) => {
  switch (action.type) {
    case 'TRANSITION_WORKFLOW':
      return transitionWorkflow({
        instanceId: action.workflowInstanceId || context.workflowInstanceId,
        transitionKey: action.transitionKey,
        actorId,
        metadata: { ruleAction: action },
      })
    case 'START_APPROVAL':
      return startApproval({
        policyKey: action.policyKey,
        subjectType: action.subjectType || context.entityType,
        subjectId: action.subjectId || context.entityId,
        context,
        actorId,
      })
    case 'START_SLA':
      return startSla({
        policyKey: action.policyKey,
        subjectType: action.subjectType || context.entityType,
        subjectId: action.subjectId || context.entityId,
        workflowStepKey: action.workflowStepKey || context.workflowStepKey,
        context,
        actorId,
      })
    case 'SEND_NOTIFICATION':
      return queueNotifications({
        event: action.event || context.event,
        entityType: action.entityType || context.entityType,
        context,
      })
    case 'WEBHOOK':
      return queueEvent({
        event: action.event || context.event,
        entityType: action.entityType || context.entityType,
        entityId: action.entityId || context.entityId,
        payload: context,
        correlationId: context.correlationId,
      })
    default:
      throw new BadRequestError(
        `Unsupported business rule action '${action.type}'.`
      )
  }
}

const dispatchAction = async ({
  action,
  context = {},
  actorId = null,
  ruleId,
  actionIndex,
  causationId = null,
}) => {
  if (!action?.type)
    throw new BadRequestError('Business rule action requires a type.')
  if (!ruleId)
    throw new BadRequestError(
      'ruleId is required when dispatching a business rule action.'
    )
  const claim = await claimAction({
    ruleId,
    actionIndex,
    event: context.event,
    entityType: context.entityType,
    entityId: context.entityId,
    correlationId: context.correlationId,
    causationId,
  })
  if (!claim.claimed) return { skipped: true, execution: claim.execution }
  try {
    const result = await executeAction({ action, context, actorId })
    const execution = await markSucceeded(claim.execution.id)
    return { skipped: false, result, execution }
  } catch (error) {
    await markFailed(claim.execution.id, error)
    throw error
  }
}

const dispatchActions = async ({
  actions = [],
  context = {},
  actorId = null,
  ruleId,
  causationId = null,
}) => {
  if (!Array.isArray(actions))
    throw new BadRequestError('Business rule actions must be an array.')
  if (!ruleId)
    throw new BadRequestError(
      'ruleId is required when dispatching business rule actions.'
    )
  const results = []
  for (let index = 0; index < actions.length; index += 1)
    results.push(
      await dispatchAction({
        action: actions[index],
        context,
        actorId,
        ruleId,
        actionIndex: index,
        causationId,
      })
    )
  return results
}

module.exports = { dispatchAction, dispatchActions }
