const prisma = require("../../infrastructure/database/prisma")
const { BadRequestError, ConflictError, NotFoundError } = require("../../common/errors/appError")
const { evaluateCondition } = require("../rules/rule.service")
const { recordAudit } = require("../audit/audit.service")

const createApprovalPolicy = async ({ key, name, description = null, entityType, priority = 100, conditions = {}, steps, actorId = null }) => {
  if (!key || !name || !entityType || !Array.isArray(steps) || !steps.length) throw new BadRequestError("Approval policy requires key, name, entityType, and steps.")
  const policy = await prisma.approvalPolicy.create({
    data: { key, name, description, entityType, priority, conditions, steps: { create: steps.map((step, index) => ({ stepOrder: step.stepOrder ?? index + 1, name: step.name, approverType: step.approverType, approverValue: step.approverValue ?? null, requiredCount: step.requiredCount ?? 1 })) } },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  })
  await recordAudit({ actorId, action: "APPROVAL_POLICY_CREATED", entityType: "ApprovalPolicy", entityId: policy.id, after: policy })
  return policy
}

const findApplicablePolicy = async ({ entityType, context = {} }) => {
  const policies = await prisma.approvalPolicy.findMany({ where: { entityType, active: true }, include: { steps: { orderBy: { stepOrder: "asc" } } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] })
  return policies.find((policy) => evaluateCondition(policy.conditions, context)) || null
}

const startApproval = async ({ policyKey, subjectType, subjectId, context = {}, actorId = null }) => {
  const policy = policyKey ? await prisma.approvalPolicy.findUnique({ where: { key: policyKey }, include: { steps: { orderBy: { stepOrder: "asc" } } } }) : await findApplicablePolicy({ entityType: subjectType, context })
  if (!policy) throw new NotFoundError("No applicable approval policy was found.")
  if (!policy.steps.length) throw new BadRequestError("Approval policy has no steps.")
  const instance = await prisma.$transaction(async (tx) => {
    const created = await tx.approvalInstance.create({ data: { policyId: policy.id, subjectType, subjectId: String(subjectId), currentStepOrder: policy.steps[0].stepOrder } })
    await tx.approvalRequest.create({ data: { instanceId: created.id, stepId: policy.steps[0].id, assigneeUserId: policy.steps[0].approverType === "USER" ? Number(policy.steps[0].approverValue) : null } })
    return tx.approvalInstance.findUnique({ where: { id: created.id }, include: { policy: { include: { steps: true } }, requests: true } })
  })
  await recordAudit({ actorId, action: "APPROVAL_STARTED", entityType: "ApprovalInstance", entityId: instance.id, after: instance })
  return instance
}

const actOnApproval = async ({ requestId, actorId, decision, comment = null }) => {
  if (!actorId || !["APPROVE", "REJECT"].includes(decision)) throw new BadRequestError("actorId and a valid approval decision are required.")
  const request = await prisma.approvalRequest.findUnique({ where: { id: requestId }, include: { instance: { include: { policy: { include: { steps: { orderBy: { stepOrder: "asc" } } } } } }, step: true } })
  if (!request) throw new NotFoundError("Approval request not found.")
  if (request.status !== "PENDING" || request.instance.status !== "PENDING") throw new ConflictError("Approval request is no longer pending.")
  if (request.assigneeUserId && request.assigneeUserId !== actorId) throw new ConflictError("Approval request is assigned to another user.")

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.approvalRequest.updateMany({ where: { id: requestId, status: "PENDING" }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", comment, actedByUserId: actorId, actedAt: new Date() } })
    if (updatedRequest.count !== 1) throw new ConflictError("Approval request changed concurrently. Retry.")
    if (decision === "REJECT") return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { status: "REJECTED" }, include: { requests: true } })
    const stepRequests = await tx.approvalRequest.findMany({ where: { instanceId: request.instanceId, stepId: request.stepId } })
    const approvedCount = stepRequests.filter((item) => item.status === "APPROVED").length
    if (approvedCount < request.step.requiredCount) return tx.approvalInstance.findUnique({ where: { id: request.instanceId }, include: { requests: true } })
    const steps = request.instance.policy.steps
    const currentIndex = steps.findIndex((step) => step.id === request.stepId)
    const next = steps[currentIndex + 1]
    if (!next) return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { status: "APPROVED", completedAt: new Date() }, include: { requests: true } })
    await tx.approvalRequest.create({ data: { instanceId: request.instanceId, stepId: next.id, assigneeUserId: next.approverType === "USER" ? Number(next.approverValue) : null } })
    return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { currentStepOrder: next.stepOrder }, include: { requests: true } })
  })
  await recordAudit({ actorId, action: `APPROVAL_${decision}`, entityType: "ApprovalInstance", entityId: request.instanceId, before: { requestId, status: "PENDING" }, after: result })
  return result
}

module.exports = { createApprovalPolicy, findApplicablePolicy, startApproval, actOnApproval }
