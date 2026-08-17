const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")
const { evaluateCondition } = require("../rules/rule.service")
const { recordAudit } = require("../audit/audit.service")

const createSlaPolicy = async ({ key, name, entityType, workflowStepKey = null, durationSeconds, warningSeconds = null, escalationSeconds = null, conditions = {}, actorId = null }) => {
  if (!key || !name || !entityType || !Number.isInteger(durationSeconds) || durationSeconds <= 0) throw new BadRequestError("SLA policy requires a positive duration in seconds.")
  if (warningSeconds != null && (warningSeconds < 0 || warningSeconds > durationSeconds)) throw new BadRequestError("warningSeconds must be between 0 and durationSeconds.")
  if (escalationSeconds != null && escalationSeconds < 0) throw new BadRequestError("escalationSeconds must be non-negative.")
  const policy = await prisma.slaPolicy.create({ data: { key, name, entityType, workflowStepKey, durationSeconds, warningSeconds, escalationSeconds, conditions } })
  await recordAudit({ actorId, action: "SLA_POLICY_CREATED", entityType: "SlaPolicy", entityId: policy.id, after: policy })
  return policy
}

const findApplicablePolicy = async ({ entityType, workflowStepKey = null, context = {} }) => {
  const policies = await prisma.slaPolicy.findMany({ where: { entityType, active: true, ...(workflowStepKey ? { OR: [{ workflowStepKey }, { workflowStepKey: null }] } : {}) }, orderBy: { createdAt: "asc" } })
  return policies.find((policy) => evaluateCondition(policy.conditions, context)) || null
}

const startSla = async ({ policyKey, subjectType, subjectId, workflowStepKey = null, context = {}, startedAt = new Date(), actorId = null }) => {
  const policy = policyKey ? await prisma.slaPolicy.findUnique({ where: { key: policyKey } }) : await findApplicablePolicy({ entityType: subjectType, workflowStepKey, context })
  if (!policy) throw new NotFoundError("No applicable SLA policy was found.")
  const dueAt = new Date(startedAt.getTime() + policy.durationSeconds * 1000)
  const warningAt = policy.warningSeconds == null ? null : new Date(startedAt.getTime() + policy.warningSeconds * 1000)
  const instance = await prisma.slaInstance.create({ data: { policyId: policy.id, subjectType, subjectId: String(subjectId), startedAt, warningAt, dueAt } })
  await recordAudit({ actorId, action: "SLA_STARTED", entityType: "SlaInstance", entityId: instance.id, after: instance })
  return instance
}

const completeSla = async ({ instanceId, actorId = null }) => {
  const current = await prisma.slaInstance.findUnique({ where: { id: instanceId } })
  if (!current) throw new NotFoundError("SLA instance not found.")
  if (current.status === "COMPLETED") throw new ConflictError("SLA instance is already completed.")
  const instance = await prisma.slaInstance.update({ where: { id: instanceId }, data: { status: "COMPLETED", completedAt: new Date() } })
  await recordAudit({ actorId, action: "SLA_COMPLETED", entityType: "SlaInstance", entityId: instance.id, before: current, after: instance })
  return instance
}

const markDueSlas = async ({ now = new Date() } = {}) => {
  const due = await prisma.slaInstance.findMany({ where: { status: "RUNNING", dueAt: { lte: now } } })
  if (!due.length) return []
  const result = await prisma.slaInstance.updateMany({ where: { id: { in: due.map((item) => item.id) }, status: "RUNNING" }, data: { status: "BREACHED" } })
  return { count: result.count, ids: due.map((item) => item.id) }
}

const markEscalations = async ({ now = new Date() } = {}) => {
  const instances = await prisma.slaInstance.findMany({ where: { status: "RUNNING", policy: { escalationSeconds: { not: null } } }, include: { policy: true } })
  const eligible = instances.filter((item) => new Date(item.startedAt.getTime() + item.policy.escalationSeconds * 1000) <= now)
  if (!eligible.length) return []
  const result = await prisma.slaInstance.updateMany({ where: { id: { in: eligible.map((item) => item.id) }, status: "RUNNING" }, data: { status: "ESCALATED", escalatedAt: now } })
  return { count: result.count, ids: eligible.map((item) => item.id) }
}

module.exports = { createSlaPolicy, findApplicablePolicy, startSla, completeSla, markDueSlas, markEscalations }
