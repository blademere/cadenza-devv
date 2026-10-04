import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import { evaluateCondition, validateCondition } from '../rules/rule.service.js'
import { recordAudit } from '../audit/audit.service.js'
import * as repository from './sla.repository.js'

const createSlaPolicy = async ({ key, name, entityType, workflowStepKey = null, durationSeconds, warningSeconds = null, escalationSeconds = null, conditions = {}, actorId = null }) => {
  if (!key || !name || !entityType || !Number.isInteger(durationSeconds) || durationSeconds <= 0) throw new BadRequestError('SLA policy requires a positive duration in seconds.')
  if (warningSeconds != null && (!Number.isInteger(warningSeconds) || warningSeconds < 0 || warningSeconds >= durationSeconds)) throw new BadRequestError('warningSeconds must be an integer before the SLA deadline.')
  if (escalationSeconds != null && (!Number.isInteger(escalationSeconds) || escalationSeconds < 0)) throw new BadRequestError('escalationSeconds must be a non-negative integer.')
  if (escalationSeconds != null && escalationSeconds >= durationSeconds) throw new BadRequestError('escalationSeconds must be before the SLA deadline.')
  validateCondition(conditions)
  const policy = await repository.createPolicy({ key, name, entityType, workflowStepKey, durationSeconds, warningSeconds, escalationSeconds, conditions })
  await recordAudit({ actorId, action: 'SLA_POLICY_CREATED', entityType: 'SlaPolicy', entityId: policy.id, after: policy })
  return policy
}

const findApplicablePolicy = async ({ entityType, workflowStepKey = null, context = {} }) => {
  const policies = await repository.findPolicies({ entityType, workflowStepKey })
  return policies.find((policy) => evaluateCondition(policy.conditions, context)) || null
}

const startSla = async ({ policyKey, subjectType, subjectId, workflowStepKey = null, context = {}, startedAt = new Date(), actorId = null }) => {
  if (!subjectType || subjectId == null) throw new BadRequestError('SLA subjectType and subjectId are required.')
  const policy = policyKey ? await repository.findPolicyByKey(policyKey) : await findApplicablePolicy({ entityType: subjectType, workflowStepKey, context })
  if (!policy) throw new NotFoundError('No applicable SLA policy was found.')
  const dueAt = new Date(startedAt.getTime() + policy.durationSeconds * 1000)
  const warningAt = policy.warningSeconds == null ? null : new Date(startedAt.getTime() + policy.warningSeconds * 1000)
  const instance = await repository.createInstance({ policyId: policy.id, subjectType, subjectId: String(subjectId), startedAt, warningAt, dueAt })
  await recordAudit({ actorId, action: 'SLA_STARTED', entityType: 'SlaInstance', entityId: instance.id, after: instance })
  return instance
}

const completeSla = async ({ instanceId, actorId = null }) => {
  const current = await repository.findInstanceById(instanceId)
  if (!current) throw new NotFoundError('SLA instance not found.')
  if (current.status === 'COMPLETED') throw new ConflictError('SLA instance is already completed.')
  if (!['RUNNING', 'ESCALATED', 'BREACHED'].includes(current.status)) throw new ConflictError(`SLA instance cannot be completed from status '${current.status}'.`)
  const instance = await repository.updateInstance(instanceId, { status: 'COMPLETED', completedAt: new Date() })
  await recordAudit({ actorId, action: 'SLA_COMPLETED', entityType: 'SlaInstance', entityId: instance.id, before: current, after: instance })
  return instance
}

const markDueSlas = async ({ now = new Date() } = {}) => {
  const due = await repository.findDueInstances(now)
  if (!due.length) return { count: 0, ids: [] }
  const ids = due.map((item) => item.id)
  const result = await repository.markBreached(ids)
  return { count: result.count, ids }
}

const markEscalations = async ({ now = new Date() } = {}) => {
  const instances = await repository.findEscalationCandidates()
  const eligible = instances.filter((item) => new Date(item.startedAt.getTime() + item.policy.escalationSeconds * 1000) <= now)
  if (!eligible.length) return { count: 0, ids: [] }
  const ids = eligible.map((item) => item.id)
  const result = await repository.markEscalated(ids, now)
  return { count: result.count, ids }
}

export { createSlaPolicy, findApplicablePolicy, startSla, completeSla, markDueSlas, markEscalations }
