import { getPrismaClient } from "../../infrastructure/database/prisma.js"
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/appError.js"
import { recordAudit } from "../audit/audit.service.js"
import { publish } from "../event-bus/event-bus.js"
import { assertTransition, assertMutable, assertRollbackTarget } from "../configuration/configuration-lifecycle.service.js"
import { WORKFLOW_STATUS } from "./workflow.constants.js"

const prisma = getPrismaClient()

const validateDefinition = ({ steps = [], transitions = [] }) => {
  if (!Array.isArray(steps) || steps.length === 0) throw new BadRequestError("A workflow version requires at least one step.")
  if (!Array.isArray(transitions)) throw new BadRequestError("Workflow transitions must be an array.")
  if (steps.filter((step) => step.isInitial).length !== 1) throw new BadRequestError("A workflow version must have exactly one initial step.")
  if (steps.filter((step) => step.isFinal).length === 0) throw new BadRequestError("A workflow version requires at least one final step.")

  const keys = new Set(steps.map((step) => step.key))
  if (keys.size !== steps.length || steps.some((step) => !step.key || !step.name)) throw new BadRequestError("Workflow steps require unique keys and names.")

  const transitionKeys = new Set()
  const adjacency = new Map(steps.map((step) => [step.key, []]))
  const outgoing = new Map(steps.map((step) => [step.key, 0]))

  for (const transition of transitions) {
    if (!transition.key || !transition.name) throw new BadRequestError("Workflow transitions require keys and names.")
    if (transitionKeys.has(transition.key)) throw new ConflictError(`Duplicate workflow transition key: ${transition.key}.`)
    transitionKeys.add(transition.key)
    if (!keys.has(transition.fromStepKey) || !keys.has(transition.toStepKey)) throw new BadRequestError(`Transition ${transition.key} references an unknown step.`)
    const from = steps.find((step) => step.key === transition.fromStepKey)
    if (from.isFinal) throw new BadRequestError(`Final workflow step '${from.key}' cannot have outgoing transitions.`)
    outgoing.set(from.key, outgoing.get(from.key) + 1)
    adjacency.get(from.key).push(transition.toStepKey)
  }

  for (const step of steps) if (!step.isFinal && outgoing.get(step.key) === 0) throw new BadRequestError(`Non-final workflow step '${step.key}' must have at least one outgoing transition.`)

  const initial = steps.find((step) => step.isInitial).key
  const reachable = new Set([initial])
  const queue = [initial]
  while (queue.length) {
    const current = queue.shift()
    for (const next of adjacency.get(current)) if (!reachable.has(next)) { reachable.add(next); queue.push(next) }
  }
  const unreachable = steps.find((step) => !reachable.has(step.key))
  if (unreachable) throw new BadRequestError(`Workflow step '${unreachable.key}' is unreachable from the initial step.`)

  const canReachFinal = new Set(steps.filter((step) => step.isFinal).map((step) => step.key))
  let changed = true
  while (changed) {
    changed = false
    for (const step of steps) if (!canReachFinal.has(step.key) && adjacency.get(step.key).some((target) => canReachFinal.has(target))) { canReachFinal.add(step.key); changed = true }
  }
  const deadEnd = steps.find((step) => !canReachFinal.has(step.key))
  if (deadEnd) throw new BadRequestError(`Workflow step '${deadEnd.key}' cannot reach a final step.`)
}

const loadVersion = async (workflowKey, version) => {
  const workflow = await prisma.workflow.findUnique({ where: { key: workflowKey } })
  if (!workflow) throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)
  const target = await prisma.workflowVersion.findUnique({ where: { workflowId_version: { workflowId: workflow.id, version } }, include: { steps: true, transitions: true } })
  if (!target) throw new NotFoundError(`Workflow '${workflowKey}' version ${version} was not found.`)
  return { workflow, target }
}

const createWorkflowVersion = async ({ workflowKey, steps, transitions = [], actorId = null }) => {
  validateDefinition({ steps, transitions })
  const workflow = await prisma.workflow.findUnique({ where: { key: workflowKey } })
  if (!workflow) throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)
  const version = await prisma.$transaction(async (tx) => {
    const latest = await tx.workflowVersion.findFirst({ where: { workflowId: workflow.id }, orderBy: { version: "desc" }, select: { version: true } })
    const created = await tx.workflowVersion.create({ data: { workflowId: workflow.id, version: (latest?.version || 0) + 1, status: WORKFLOW_STATUS.DRAFT, steps: { create: steps.map((step, index) => ({ key: step.key, name: step.name, description: step.description || null, sortOrder: step.sortOrder ?? index, isInitial: Boolean(step.isInitial), isFinal: Boolean(step.isFinal) })) } }, include: { steps: true } })
    const stepByKey = new Map(created.steps.map((step) => [step.key, step]))
    for (const transition of transitions) await tx.workflowTransition.create({ data: { workflowVersionId: created.id, fromStepId: stepByKey.get(transition.fromStepKey).id, toStepId: stepByKey.get(transition.toStepKey).id, key: transition.key, name: transition.name, description: transition.description || null, permissionKey: transition.permissionKey || null } })
    return tx.workflowVersion.findUnique({ where: { id: created.id }, include: { steps: true, transitions: true } })
  })
  await recordAudit({ actorId, action: "VERSION_CREATED", entityType: "WorkflowVersion", entityId: version.id, after: version, metadata: { workflowKey, version: version.version } })
  return version
}

const validateWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { target } = await loadVersion(workflowKey, version)
  assertTransition(target.status, WORKFLOW_STATUS.VALIDATED)
  validateDefinition({ steps: target.steps, transitions: target.transitions.map((transition) => ({ ...transition, fromStepKey: target.steps.find((step) => step.id === transition.fromStepId)?.key, toStepKey: target.steps.find((step) => step.id === transition.toStepId)?.key })) })
  const result = await prisma.workflowVersion.updateMany({ where: { id: target.id, status: WORKFLOW_STATUS.DRAFT }, data: { status: WORKFLOW_STATUS.VALIDATED } })
  if (result.count !== 1) throw new ConflictError("Workflow version changed concurrently. Retry validation.")
  const validated = await prisma.workflowVersion.findUnique({ where: { id: target.id }, include: { steps: true, transitions: true } })
  await recordAudit({ actorId, action: "VERSION_VALIDATED", entityType: "WorkflowVersion", entityId: validated.id, after: validated, metadata: { workflowKey, version } })
  return validated
}

const publishWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { workflow, target } = await loadVersion(workflowKey, version)
  if (target.status === WORKFLOW_STATUS.PUBLISHED) return target
  assertTransition(target.status, WORKFLOW_STATUS.PUBLISHED)
  assertMutable(target.status)
  const published = await prisma.$transaction(async (tx) => {
    const current = await tx.workflowVersion.findFirst({ where: { workflowId: workflow.id, status: WORKFLOW_STATUS.PUBLISHED }, select: { id: true } })
    if (current?.id === target.id) return target
    if (current) await tx.workflowVersion.update({ where: { id: current.id }, data: { status: WORKFLOW_STATUS.ARCHIVED } })
    const updated = await tx.workflowVersion.updateMany({ where: { id: target.id, status: WORKFLOW_STATUS.VALIDATED }, data: { status: WORKFLOW_STATUS.PUBLISHED } })
    if (updated.count !== 1) throw new ConflictError("Workflow version changed concurrently. Retry publication.")
    return tx.workflowVersion.findUnique({ where: { id: target.id }, include: { steps: true, transitions: true } })
  })
  await recordAudit({ actorId, action: "VERSION_PUBLISHED", entityType: "WorkflowVersion", entityId: published.id, after: published, metadata: { workflowKey, version: published.version } })
  await publish({ event: "configuration.published", entityType: "WorkflowVersion", entityId: published.id, actorId, context: { configurationType: "workflow", workflowKey, version: published.version }, idempotencyKey: `workflow-version:${published.id}:published` })
  return published
}

const rollbackWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { workflow, target } = await loadVersion(workflowKey, version)
  assertRollbackTarget(target.status)
  const published = await prisma.$transaction(async (tx) => {
    const current = await tx.workflowVersion.findFirst({ where: { workflowId: workflow.id, status: WORKFLOW_STATUS.PUBLISHED }, select: { id: true } })
    if (current?.id === target.id) throw new ConflictError("Rollback target is already published.")
    if (current) await tx.workflowVersion.update({ where: { id: current.id, status: WORKFLOW_STATUS.PUBLISHED }, data: { status: WORKFLOW_STATUS.ARCHIVED } })
    const result = await tx.workflowVersion.updateMany({ where: { id: target.id, status: WORKFLOW_STATUS.ARCHIVED }, data: { status: WORKFLOW_STATUS.PUBLISHED } })
    if (result.count !== 1) throw new ConflictError("Workflow rollback target changed concurrently. Retry rollback.")
    return tx.workflowVersion.findUnique({ where: { id: target.id }, include: { steps: true, transitions: true } })
  })
  await recordAudit({ actorId, action: "VERSION_ROLLED_BACK", entityType: "WorkflowVersion", entityId: published.id, after: published, metadata: { workflowKey, version: published.version } })
  await publish({ event: "configuration.rollback", entityType: "WorkflowVersion", entityId: published.id, actorId, context: { configurationType: "workflow", workflowKey, version: published.version }, idempotencyKey: `workflow-version:${published.id}:rollback:${published.updatedAt.toISOString()}` })
  return published
}

export { createWorkflowVersion, validateWorkflowVersion, publishWorkflowVersion, rollbackWorkflowVersion, validateDefinition }
