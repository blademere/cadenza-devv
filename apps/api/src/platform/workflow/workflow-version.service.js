import { getPrismaClient } from "../../infrastructure/database/prisma.js"
import { ConflictError, NotFoundError } from "../../common/errors/appError.js"
import { recordAudit } from "../audit/audit.service.js"
import { publish } from "../event-bus/event-bus.js"
import { assertTransition, assertMutable, assertRollbackTarget } from "../configuration/configuration-lifecycle.service.js"
import { WORKFLOW_STATUS } from "./workflow.constants.js"
import { validateDefinition } from "./workflow-version.validation.js"

const prisma = getPrismaClient()

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
