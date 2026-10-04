import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/appError.js'
import { evaluateCondition, validateCondition } from '../rules/rule.service.js'
import { recordAudit } from '../audit/audit.service.js'
import { resolveApproverIds } from './approval.approver.js'
import { runTransaction, createPolicy, findPolicies, findPolicyByKey, findPendingInstance, createInstance, createRequests, findInstance, findRequest, updateRequest, cancelPendingRequests, findStepRequests, skipPendingStepRequests, updateInstance } from './approval.repository.js'

const createApprovalPolicy = async ({ key, name, description = null, entityType, priority = 100, conditions = {}, steps, actorId = null }) => {
  if (!key || !name || !entityType || !Array.isArray(steps) || !steps.length) throw new BadRequestError('Approval policy requires key, name, entityType, and steps.')
  validateCondition(conditions)
  const orders = new Set()
  for (const [index, step] of steps.entries()) {
    if (!step.name || !step.approverType || !step.approverValue) throw new BadRequestError('Every approval step requires an approver configuration.')
    const requiredCount = step.requiredCount ?? 1
    if (!Number.isInteger(requiredCount) || requiredCount < 1) throw new BadRequestError('requiredCount must be a positive integer.')
    const stepOrder = step.stepOrder ?? index + 1
    if (!Number.isInteger(stepOrder) || stepOrder < 1 || orders.has(stepOrder)) throw new BadRequestError('Approval stepOrder values must be unique positive integers.')
    orders.add(stepOrder)
    if (!['USER', 'ROLE', 'PERMISSION'].includes(step.approverType)) throw new BadRequestError(`Unsupported approver type '${step.approverType}'.`)
  }
  const policy = await createPolicy({ key, name, description, entityType, priority, conditions, steps: { create: steps.map((step, index) => ({ stepOrder: step.stepOrder ?? index + 1, name: step.name, approverType: step.approverType, approverValue: step.approverValue, requiredCount: step.requiredCount ?? 1 })) } })
  await recordAudit({ actorId, action: 'APPROVAL_POLICY_CREATED', entityType: 'ApprovalPolicy', entityId: policy.id, after: policy })
  return policy
}

const findApplicablePolicy = async ({ entityType, context = {} }) => {
  const policies = await findPolicies({ entityType })
  return policies.find((policy) => evaluateCondition(policy.conditions, context)) || null
}
const isUniqueConstraintError = (error) => error?.code === 'P2002'

const startApproval = async ({ policyKey, subjectType, subjectId, context = {}, actorId = null, appId = null }) => {
  if (!subjectType || subjectId == null) throw new BadRequestError('Approval subjectType and subjectId are required.')
  const applicationId = appId ?? context.appId ?? null
  const policy = policyKey ? await findPolicyByKey(policyKey) : await findApplicablePolicy({ entityType: subjectType, context })
  if (!policy) throw new NotFoundError('No applicable approval policy was found.')
  if (!policy.steps.length) throw new BadRequestError('Approval policy has no steps.')
  let instance
  try {
    instance = await runTransaction(async (tx) => {
      const existing = await findPendingInstance({ policyId: policy.id, subjectType, subjectId }, tx)
      if (existing) return existing
      const firstStep = policy.steps[0]
      const approverIds = await resolveApproverIds(firstStep, tx, applicationId)
      if (approverIds.length < firstStep.requiredCount) throw new ConflictError(`Approval step '${firstStep.name}' requires ${firstStep.requiredCount} eligible approver(s), but only ${approverIds.length} are available.`)
      const created = await createInstance({ policyId: policy.id, appId: applicationId, subjectType, subjectId: String(subjectId), currentStepOrder: firstStep.stepOrder }, tx)
      await createRequests(approverIds.map((assigneeUserId) => ({ instanceId: created.id, stepId: firstStep.id, assigneeUserId })), tx)
      return findInstance(created.id, tx)
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    instance = await findPendingInstance({ policyId: policy.id, subjectType, subjectId })
    if (!instance) throw new ConflictError('Approval instance was created concurrently but could not be reloaded. Retry.')
  }
  await recordAudit({ actorId, appId: applicationId, action: 'APPROVAL_STARTED', entityType: 'ApprovalInstance', entityId: instance.id, after: instance })
  return instance
}

const actOnApproval = async ({ requestId, actorId, decision, comment = null }) => {
  if (!actorId || !['APPROVE', 'REJECT'].includes(decision)) throw new BadRequestError('actorId and a valid approval decision are required.')
  const request = await findRequest(requestId)
  if (!request) throw new NotFoundError('Approval request not found.')
  if (request.status !== 'PENDING' || request.instance.status !== 'PENDING') throw new ConflictError('Approval request is no longer pending.')
  if (request.step.stepOrder !== request.instance.currentStepOrder) throw new ConflictError('Approval request is not part of the current approval step.')
  if (!request.assigneeUserId || request.assigneeUserId !== actorId) throw new ForbiddenError('You are not an eligible approver for this request.')
  const result = await runTransaction(async (tx) => {
    const updatedRequest = await updateRequest(requestId, actorId, { status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED', comment, actedByUserId: actorId, actedAt: new Date() }, tx)
    if (updatedRequest.count !== 1) throw new ConflictError('Approval request changed concurrently. Retry.')
    if (decision === 'REJECT') { await cancelPendingRequests(request.instanceId, tx); return updateInstance(request.instanceId, { status: 'REJECTED' }, tx) }
    const stepRequests = await findStepRequests(request.instanceId, request.stepId, tx)
    const approvedCount = stepRequests.filter((item) => item.status === 'APPROVED').length
    if (approvedCount < request.step.requiredCount) return findInstance(request.instanceId, tx)
    await skipPendingStepRequests(request.instanceId, request.stepId, tx)
    const steps = request.instance.policy.steps
    const currentIndex = steps.findIndex((step) => step.id === request.stepId)
    const next = steps[currentIndex + 1]
    if (!next) return updateInstance(request.instanceId, { status: 'APPROVED', completedAt: new Date() }, tx)
    const nextApproverIds = await resolveApproverIds(next, tx, request.instance.appId)
    if (nextApproverIds.length < next.requiredCount) throw new ConflictError(`Approval step '${next.name}' requires ${next.requiredCount} eligible approver(s), but only ${nextApproverIds.length} are available.`)
    await createRequests(nextApproverIds.map((assigneeUserId) => ({ instanceId: request.instanceId, stepId: next.id, assigneeUserId })), tx)
    return updateInstance(request.instanceId, { currentStepOrder: next.stepOrder }, tx)
  })
  await recordAudit({ actorId, appId: request.instance.appId, action: `APPROVAL_${decision}`, entityType: 'ApprovalInstance', entityId: result.id, after: result })
  return result
}

export { createApprovalPolicy, findApplicablePolicy, startApproval, actOnApproval, resolveApproverIds }
