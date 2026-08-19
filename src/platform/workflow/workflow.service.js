const prisma = require("../../infrastructure/database/prisma")
const {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require("../../common/errors/appError")
const { recordAudit } = require("../audit/audit.service")
const { can } = require("../authorization/access-control.service")
const { publish } = require("../event-bus/event-bus")
const {
  findWorkflowByKey,
  findPublishedVersion,
  findInstance,
  findInstanceWithHistory,
} = require("./workflow.repository")
const { WORKFLOW_ACTIONS, WORKFLOW_STATUS } = require("./workflow.constants")

const parsePermissionKey = (permissionKey) => {
  if (!permissionKey) return null
  const separator = permissionKey.indexOf(":")
  if (separator <= 0 || separator === permissionKey.length - 1) throw new BadRequestError(`Invalid workflow permission key '${permissionKey}'.`)
  return { resource: permissionKey.slice(0, separator), action: permissionKey.slice(separator + 1) }
}

const assertWorkflowDefinition = ({ steps = [], transitions = [] }) => {
  if (!Array.isArray(steps) || steps.length === 0) throw new BadRequestError("A workflow version requires at least one step.")
  if (!Array.isArray(transitions)) throw new BadRequestError("Workflow transitions must be an array.")

  const initialSteps = steps.filter((step) => step && step.isInitial)
  const finalSteps = steps.filter((step) => step && step.isFinal)
  if (initialSteps.length !== 1) throw new BadRequestError("A workflow version must have exactly one initial step.")
  if (finalSteps.length === 0) throw new BadRequestError("A workflow version requires at least one final step.")

  const keys = new Set()
  for (const step of steps) {
    if (!step || !step.key || !step.name) throw new BadRequestError("Every workflow step requires a key and name.")
    if (keys.has(step.key)) throw new ConflictError(`Duplicate workflow step key: ${step.key}.`)
    keys.add(step.key)
  }

  const stepKeys = new Set(steps.map((step) => step.key))
  const transitionKeys = new Set()
  const outgoing = new Map(steps.map((step) => [step.key, 0]))
  const adjacency = new Map(steps.map((step) => [step.key, []]))

  for (const transition of transitions) {
    if (!transition || !transition.key || !transition.name) throw new BadRequestError("Every workflow transition requires a key and name.")
    if (transitionKeys.has(transition.key)) throw new ConflictError(`Duplicate workflow transition key: ${transition.key}.`)
    transitionKeys.add(transition.key)

    if (!stepKeys.has(transition.fromStepKey) || !stepKeys.has(transition.toStepKey)) {
      throw new BadRequestError(`Transition ${transition.key} references an unknown workflow step.`)
    }

    if (transition.permissionKey) parsePermissionKey(transition.permissionKey)

    const fromStep = steps.find((step) => step.key === transition.fromStepKey)
    if (fromStep.isFinal) throw new BadRequestError(`Final workflow step '${fromStep.key}' cannot have outgoing transitions.`)

    outgoing.set(fromStep.key, outgoing.get(fromStep.key) + 1)
    adjacency.get(fromStep.key).push(transition.toStepKey)
  }

  for (const step of steps) {
    if (!step.isFinal && outgoing.get(step.key) === 0) {
      throw new BadRequestError(`Non-final workflow step '${step.key}' must have at least one outgoing transition.`)
    }
  }

  const reachable = new Set([initialSteps[0].key])
  const queue = [initialSteps[0].key]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current)) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }

  const unreachable = steps.find((step) => !reachable.has(step.key))
  if (unreachable) throw new BadRequestError(`Workflow step '${unreachable.key}' is unreachable from the initial step.`)
}

const assertTransitionPermission = async ({ transition, actorId }) => {
  if (!transition.permissionKey) return
  if (!actorId) throw new ForbiddenError("This workflow transition requires an authenticated actor.")
  const permission = parsePermissionKey(transition.permissionKey)
  const allowed = await can({ userId: actorId, ...permission })
  if (!allowed) throw new ForbiddenError(`Missing permission '${transition.permissionKey}'.`)
}

const createWorkflow = async ({ key, name, description = null, steps, transitions = [], actorId = null }) => {
  if (!key || !name) throw new BadRequestError("Workflow key and name are required.")
  assertWorkflowDefinition({ steps, transitions })
  const existing = await findWorkflowByKey(key)
  if (existing) throw new ConflictError(`Workflow '${key}' already exists.`)
  const workflow = await prisma.$transaction(async (tx) => {
    const created = await tx.workflow.create({
      data: { key, name, description, versions: { create: { version: 1, status: WORKFLOW_STATUS.PUBLISHED, steps: { create: steps.map((step, index) => ({ key: step.key, name: step.name, description: step.description || null, sortOrder: step.sortOrder ?? index, isInitial: Boolean(step.isInitial), isFinal: Boolean(step.isFinal) })) } } } },
      include: { versions: { include: { steps: true } } },
    })
    const version = created.versions[0]
    const stepByKey = new Map(version.steps.map((step) => [step.key, step]))
    for (const transition of transitions) {
      await tx.workflowTransition.create({ data: { workflowVersionId: version.id, fromStepId: stepByKey.get(transition.fromStepKey).id, toStepId: stepByKey.get(transition.toStepKey).id, key: transition.key, name: transition.name, description: transition.description || null, permissionKey: transition.permissionKey || null } })
    }
    return tx.workflow.findUnique({ where: { id: created.id }, include: { versions: { include: { steps: true, transitions: true }, orderBy: { version: "desc" } } } })
  })
  await recordAudit({ actorId, action: WORKFLOW_ACTIONS.CREATED, entityType: "Workflow", entityId: workflow.id, after: workflow })
  return workflow
}

const startWorkflow = async ({ workflowKey, subjectType, subjectId, actorId = null, metadata }) => {
  if (!subjectType || subjectId === undefined || subjectId === null) throw new BadRequestError("subjectType and subjectId are required.")
  const version = await findPublishedVersion(workflowKey)
  if (!version) throw new NotFoundError(`Published workflow '${workflowKey}' was not found.`)
  const initialStep = version.steps.find((step) => step.isInitial)
  if (!initialStep) throw new BadRequestError("The published workflow has no initial step.")
  const normalizedSubjectId = String(subjectId)
  const instance = await prisma.$transaction(async (tx) => {
    const created = await tx.workflowInstance.create({ data: { workflowVersionId: version.id, currentStepId: initialStep.id, subjectType, subjectId: normalizedSubjectId, startedByUserId: actorId } })
    await tx.workflowHistory.create({ data: { instanceId: created.id, toStepId: initialStep.id, actorId, metadata: metadata || undefined } })
    await publish({
      db: tx,
      event: "workflow.started",
      entityType: subjectType,
      entityId: normalizedSubjectId,
      actorId,
      context: { workflowKey, workflowInstanceId: created.id, workflowStepKey: initialStep.key, metadata: metadata || {} },
      idempotencyKey: `workflow:${created.id}:started`,
    })
    return created
  })
  await recordAudit({ actorId, action: WORKFLOW_ACTIONS.STARTED, entityType: "WorkflowInstance", entityId: instance.id, after: instance, metadata: { workflowKey, subjectType, subjectId: normalizedSubjectId } })
  return findInstance(instance.id)
}

const transitionWorkflow = async ({ instanceId, transitionKey, actorId = null, metadata }) => {
  const instance = await findInstance(instanceId)
  if (!instance) throw new NotFoundError("Workflow instance not found.")
  if (instance.completedAt) throw new ConflictError("Workflow instance is already completed.")
  const transition = await prisma.workflowTransition.findFirst({ where: { workflowVersionId: instance.workflowVersionId, fromStepId: instance.currentStepId, key: transitionKey }, include: { toStep: true } })
  if (!transition) throw new BadRequestError(`Transition '${transitionKey}' is not available from step '${instance.currentStep.key}'.`)
  await assertTransitionPermission({ transition, actorId })

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.workflowInstance.updateMany({ where: { id: instanceId, currentStepId: instance.currentStepId, completedAt: null }, data: { currentStepId: transition.toStepId, completedAt: transition.toStep.isFinal ? new Date() : null } })
    if (result.count !== 1) throw new ConflictError("Workflow instance changed concurrently. Retry the transition.")
    await tx.workflowHistory.create({ data: { instanceId, fromStepId: instance.currentStepId, toStepId: transition.toStepId, transitionId: transition.id, actorId, metadata: metadata || undefined } })
    await publish({
      db: tx,
      event: transition.toStep.isFinal ? "workflow.completed" : "workflow.transitioned",
      entityType: instance.subjectType,
      entityId: instance.subjectId,
      actorId,
      context: {
        workflowInstanceId: instanceId,
        workflowStepKey: transition.toStep.key,
        previousWorkflowStepKey: instance.currentStep.key,
        transitionKey,
        transitionId: transition.id,
        metadata: metadata || {},
      },
      idempotencyKey: `workflow:${instanceId}:transition:${transition.id}:${transition.toStepId}`,
    })
    return tx.workflowInstance.findUnique({ where: { id: instanceId }, include: { currentStep: true } })
  })

  const action = transition.toStep.isFinal ? WORKFLOW_ACTIONS.COMPLETED : WORKFLOW_ACTIONS.TRANSITIONED
  await recordAudit({ actorId, action, entityType: "WorkflowInstance", entityId: instanceId, before: { currentStepId: instance.currentStepId, currentStep: instance.currentStep.key }, after: { currentStepId: updated.currentStepId, currentStep: updated.currentStep.key }, metadata: { transitionKey, transitionId: transition.id, ...metadata } })
  return updated
}

const getWorkflowInstance = async (instanceId) => {
  const instance = await findInstanceWithHistory(instanceId)
  if (!instance) throw new NotFoundError("Workflow instance not found.")
  return instance
}

module.exports = { createWorkflow, startWorkflow, transitionWorkflow, getWorkflowInstance, assertTransitionPermission, assertWorkflowDefinition }
