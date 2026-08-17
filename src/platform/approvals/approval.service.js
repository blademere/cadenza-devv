const { getPrismaClient } = require("../../infrastructure/database/prisma")
const prisma = getPrismaClient()
const { BadRequestError, ConflictError, ForbiddenError, NotFoundError } = require("../../common/errors/appError")
const { evaluateCondition, validateCondition } = require("../rules/rule.service")
const { recordAudit } = require("../audit/audit.service")

const parsePermissionKey = (key) => {
  const index = key?.indexOf(".")
  if (!key || index <= 0 || index === key.length - 1) throw new BadRequestError(`Invalid permission key '${key}'.`)
  return { resource: key.slice(0, index), action: key.slice(index + 1) }
}

const resolveApproverIds = async (step, db = prisma) => {
  if (!step.approverType || !step.approverValue) throw new BadRequestError(`Approval step '${step.name}' has no approver configuration.`)
  if (step.approverType === "USER") {
    const userId = Number(step.approverValue)
    if (!Number.isInteger(userId)) throw new BadRequestError(`Invalid user approver '${step.approverValue}'.`)
    const user = await db.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } })
    return user ? [user.id] : []
  }
  if (step.approverType === "ROLE") {
    const users = await db.user.findMany({ where: { isActive: true, role: { name: step.approverValue } }, select: { id: true }, orderBy: { id: "asc" } })
    return users.map((user) => user.id)
  }
  if (step.approverType === "PERMISSION") {
    const { resource, action } = parsePermissionKey(step.approverValue)
    const users = await db.user.findMany({ where: { isActive: true, role: { permissions: { some: { permission: { action, module: { key: resource } } } } } }, select: { id: true }, orderBy: { id: "asc" } })
    return users.map((user) => user.id)
  }
  throw new BadRequestError(`Unsupported approver type '${step.approverType}'.`)
}

const createApprovalPolicy = async ({ key, name, description = null, entityType, priority = 100, conditions = {}, steps, actorId = null }) => {
  if (!key || !name || !entityType || !Array.isArray(steps) || !steps.length) throw new BadRequestError("Approval policy requires key, name, entityType, and steps.")
  validateCondition(conditions)
  const orders = new Set()
  for (const [index, step] of steps.entries()) {
    if (!step.name || !step.approverType || !step.approverValue) throw new BadRequestError("Every approval step requires an approver configuration.")
    if (!Number.isInteger(step.requiredCount) || (step.requiredCount ?? 1) < 1) throw new BadRequestError("requiredCount must be a positive integer.")
    const stepOrder = step.stepOrder ?? index + 1
    if (!Number.isInteger(stepOrder) || stepOrder < 1 || orders.has(stepOrder)) throw new BadRequestError("Approval stepOrder values must be unique positive integers.")
    orders.add(stepOrder)
    if (!["USER", "ROLE", "PERMISSION"].includes(step.approverType)) throw new BadRequestError(`Unsupported approver type '${step.approverType}'.`)
  }
  const policy = await prisma.approvalPolicy.create({ data: { key, name, description, entityType, priority, conditions, steps: { create: steps.map((step, index) => ({ stepOrder: step.stepOrder ?? index + 1, name: step.name, approverType: step.approverType, approverValue: step.approverValue, requiredCount: step.requiredCount ?? 1 })) } }, include: { steps: { orderBy: { stepOrder: "asc" } } } })
  await recordAudit({ actorId, action: "APPROVAL_POLICY_CREATED", entityType: "ApprovalPolicy", entityId: policy.id, after: policy })
  return policy
}

const findApplicablePolicy = async ({ entityType, context = {} }) => {
  const policies = await prisma.approvalPolicy.findMany({ where: { entityType, active: true }, include: { steps: { orderBy: { stepOrder: "asc" } } }, orderBy: [{ priority: "asc" }, { createdAt: "asc" }] })
  return policies.find((policy) => evaluateCondition(policy.conditions, context)) || null
}

const isUniqueConstraintError = (error) => error?.code === "P2002"

const startApproval = async ({ policyKey, subjectType, subjectId, context = {}, actorId = null }) => {
  if (!subjectType || subjectId == null) throw new BadRequestError("Approval subjectType and subjectId are required.")
  const policy = policyKey ? await prisma.approvalPolicy.findUnique({ where: { key: policyKey }, include: { steps: { orderBy: { stepOrder: "asc" } } } }) : await findApplicablePolicy({ entityType: subjectType, context })
  if (!policy) throw new NotFoundError("No applicable approval policy was found.")
  if (!policy.steps.length) throw new BadRequestError("Approval policy has no steps.")

  let instance
  try {
    instance = await prisma.$transaction(async (tx) => {
      const existing = await tx.approvalInstance.findFirst({ where: { policyId: policy.id, subjectType, subjectId: String(subjectId), status: "PENDING" }, include: { policy: { include: { steps: true } }, requests: true } })
      if (existing) return existing
      const firstStep = policy.steps[0]
      const approverIds = await resolveApproverIds(firstStep, tx)
      if (approverIds.length < firstStep.requiredCount) throw new ConflictError(`Approval step '${firstStep.name}' requires ${firstStep.requiredCount} eligible approver(s), but only ${approverIds.length} are available.`)
      const created = await tx.approvalInstance.create({ data: { policyId: policy.id, subjectType, subjectId: String(subjectId), currentStepOrder: firstStep.stepOrder } })
      await tx.approvalRequest.createMany({ data: approverIds.map((assigneeUserId) => ({ instanceId: created.id, stepId: firstStep.id, assigneeUserId })) })
      return tx.approvalInstance.findUnique({ where: { id: created.id }, include: { policy: { include: { steps: true } }, requests: true } })
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    instance = await prisma.approvalInstance.findFirst({ where: { policyId: policy.id, subjectType, subjectId: String(subjectId), status: "PENDING" }, include: { policy: { include: { steps: true } }, requests: true } })
    if (!instance) throw new ConflictError("Approval instance was created concurrently but could not be reloaded. Retry.")
  }
  await recordAudit({ actorId, action: "APPROVAL_STARTED", entityType: "ApprovalInstance", entityId: instance.id, after: instance })
  return instance
}

const actOnApproval = async ({ requestId, actorId, decision, comment = null }) => {
  if (!actorId || !["APPROVE", "REJECT"].includes(decision)) throw new BadRequestError("actorId and a valid approval decision are required.")
  const request = await prisma.approvalRequest.findUnique({ where: { id: requestId }, include: { instance: { include: { policy: { include: { steps: { orderBy: { stepOrder: "asc" } } } } } }, step: true } })
  if (!request) throw new NotFoundError("Approval request not found.")
  if (request.status !== "PENDING" || request.instance.status !== "PENDING") throw new ConflictError("Approval request is no longer pending.")
  if (request.step.stepOrder !== request.instance.currentStepOrder) throw new ConflictError("Approval request is not part of the current approval step.")
  if (!request.assigneeUserId || request.assigneeUserId !== actorId) throw new ForbiddenError("You are not an eligible approver for this request.")

  const result = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.approvalRequest.updateMany({ where: { id: requestId, assigneeUserId: actorId, status: "PENDING" }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", comment, actedByUserId: actorId, actedAt: new Date() } })
    if (updatedRequest.count !== 1) throw new ConflictError("Approval request changed concurrently. Retry.")
    if (decision === "REJECT") {
      await tx.approvalRequest.updateMany({ where: { instanceId: request.instanceId, status: "PENDING" }, data: { status: "CANCELLED", actedAt: new Date() } })
      return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { status: "REJECTED" }, include: { requests: true } })
    }
    const stepRequests = await tx.approvalRequest.findMany({ where: { instanceId: request.instanceId, stepId: request.stepId } })
    const approvedCount = stepRequests.filter((item) => item.status === "APPROVED").length
    if (approvedCount < request.step.requiredCount) return tx.approvalInstance.findUnique({ where: { id: request.instanceId }, include: { requests: true } })
    await tx.approvalRequest.updateMany({ where: { instanceId: request.instanceId, stepId: request.stepId, status: "PENDING" }, data: { status: "SKIPPED", actedAt: new Date() } })
    const steps = request.instance.policy.steps
    const currentIndex = steps.findIndex((step) => step.id === request.stepId)
    const next = steps[currentIndex + 1]
    if (!next) return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { status: "APPROVED", completedAt: new Date() }, include: { requests: true } })
    const nextApproverIds = await resolveApproverIds(next, tx)
    if (nextApproverIds.length < next.requiredCount) throw new ConflictError(`Approval step '${next.name}' requires ${next.requiredCount} eligible approver(s), but only ${nextApproverIds.length} are available.`)
    await tx.approvalRequest.createMany({ data: nextApproverIds.map((assigneeUserId) => ({ instanceId: request.instanceId, stepId: next.id, assigneeUserId })) })
    return tx.approvalInstance.update({ where: { id: request.instanceId }, data: { currentStepOrder: next.stepOrder }, include: { requests: true } })
  })
  await recordAudit({ actorId, action: `APPROVAL_${decision}`, entityType: "ApprovalInstance", entityId: result.id, after: result })
  return result
}

module.exports = { createApprovalPolicy, findApplicablePolicy, startApproval, actOnApproval, resolveApproverIds }