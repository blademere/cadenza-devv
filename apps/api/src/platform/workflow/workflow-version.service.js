import { ConflictError, NotFoundError } from "../../common/errors/appError.js"
import { recordAudit } from "../audit/audit.service.js"
import { publish } from "../event-bus/event-bus.js"
import { assertTransition, assertMutable, assertRollbackTarget } from "../configuration/configuration-lifecycle.service.js"
import { WORKFLOW_STATUS } from "./workflow.constants.js"
import { validateDefinition } from "./workflow-version.validation.js"
import {
  runTransaction,
  findWorkflowByKey,
  findVersion,
  findLatestVersionNumber,
  createVersion,
  createTransition,
  findVersionWithRelations,
  updateValidated,
  findPublishedVersion,
  archiveVersion,
  publishValidated,
  archivePublished,
  publishArchived,
} from "./workflow-version.repository.js"

const isUniqueConstraintError = (error) => error?.code === "P2002"

const loadVersion = async (workflowKey, version) => {
  const workflow = await findWorkflowByKey(workflowKey)
  if (!workflow) throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)
  const target = await findVersion(workflow.id, version)
  if (!target) throw new NotFoundError(`Workflow '${workflowKey}' version ${version} was not found.`)
  return { workflow, target }
}

const createWorkflowVersion = async ({ workflowKey, steps, transitions = [], actorId = null }) => {
  validateDefinition({ steps, transitions })
  const workflow = await findWorkflowByKey(workflowKey)
  if (!workflow) throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)

  let version
  try {
    version = await runTransaction(async (tx) => {
      const latest = await findLatestVersionNumber(workflow.id, tx)
      const created = await createVersion({
        workflowId: workflow.id,
        steps,
        transitions,
        version: (latest?.version || 0) + 1,
      }, tx)
      const stepByKey = new Map(created.steps.map((step) => [step.key, step]))
      for (const transition of transitions) {
        await createTransition({
          workflowVersionId: created.id,
          fromStepId: stepByKey.get(transition.fromStepKey).id,
          toStepId: stepByKey.get(transition.toStepKey).id,
          key: transition.key,
          name: transition.name,
          description: transition.description || null,
          permissionKey: transition.permissionKey || null,
        }, tx)
      }
      return findVersionWithRelations(created.id, tx)
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Workflow version changed concurrently. Retry version creation.")
    }
    throw error
  }

  await recordAudit({ actorId, action: "VERSION_CREATED", entityType: "WorkflowVersion", entityId: version.id, after: version, metadata: { workflowKey, version: version.version } })
  return version
}

const validateWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { target } = await loadVersion(workflowKey, version)
  assertTransition(target.status, WORKFLOW_STATUS.VALIDATED)
  validateDefinition({ steps: target.steps, transitions: target.transitions.map((transition) => ({ ...transition, fromStepKey: target.steps.find((step) => step.id === transition.fromStepId)?.key, toStepKey: target.steps.find((step) => step.id === transition.toStepId)?.key })) })
  const result = await updateValidated(target.id)
  if (result.count !== 1) throw new ConflictError("Workflow version changed concurrently. Retry validation.")
  const validated = await findVersionWithRelations(target.id)
  await recordAudit({ actorId, action: "VERSION_VALIDATED", entityType: "WorkflowVersion", entityId: validated.id, after: validated, metadata: { workflowKey, version } })
  return validated
}

const publishWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { workflow, target } = await loadVersion(workflowKey, version)
  if (target.status === WORKFLOW_STATUS.PUBLISHED) return target
  assertTransition(target.status, WORKFLOW_STATUS.PUBLISHED)
  assertMutable(target.status)

  let published
  try {
    published = await runTransaction(async (tx) => {
      const current = await findPublishedVersion(workflow.id, tx)
      if (current?.id === target.id) return target
      if (current) await archiveVersion(current.id, tx)
      const updated = await publishValidated(target.id, tx)
      if (updated.count !== 1) throw new ConflictError("Workflow version changed concurrently. Retry publication.")
      return findVersionWithRelations(target.id, tx)
    })
  } catch (error) {
    if (error instanceof ConflictError) throw error
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Another workflow version was published concurrently. Reload and retry publication.")
    }
    throw error
  }

  await recordAudit({ actorId, action: "VERSION_PUBLISHED", entityType: "WorkflowVersion", entityId: published.id, after: published, metadata: { workflowKey, version: published.version } })
  await publish({ event: "configuration.published", entityType: "WorkflowVersion", entityId: published.id, actorId, context: { configurationType: "workflow", workflowKey, version: published.version }, idempotencyKey: `workflow-version:${published.id}:published` })
  return published
}

const rollbackWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const { workflow, target } = await loadVersion(workflowKey, version)
  assertRollbackTarget(target.status)

  let published
  try {
    published = await runTransaction(async (tx) => {
      const current = await findPublishedVersion(workflow.id, tx)
      if (current?.id === target.id) throw new ConflictError("Rollback target is already published.")
      if (current) await archivePublished(current.id, tx)
      const result = await publishArchived(target.id, tx)
      if (result.count !== 1) throw new ConflictError("Workflow rollback target changed concurrently. Retry rollback.")
      return findVersionWithRelations(target.id, tx)
    })
  } catch (error) {
    if (error instanceof ConflictError) throw error
    if (isUniqueConstraintError(error)) {
      throw new ConflictError("Another workflow version was published concurrently. Reload and retry rollback.")
    }
    throw error
  }

  await recordAudit({ actorId, action: "VERSION_ROLLED_BACK", entityType: "WorkflowVersion", entityId: published.id, after: published, metadata: { workflowKey, version: published.version } })
  await publish({ event: "configuration.rollback", entityType: "WorkflowVersion", entityId: published.id, actorId, context: { configurationType: "workflow", workflowKey, version: published.version }, idempotencyKey: `workflow-version:${published.id}:rollback:${published.updatedAt.toISOString()}` })
  return published
}

export { createWorkflowVersion, validateWorkflowVersion, publishWorkflowVersion, rollbackWorkflowVersion, validateDefinition }
