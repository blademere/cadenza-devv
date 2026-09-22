import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors/appError.js"
import { recordAudit } from "../audit/audit.service.js"
import { can } from "../authorization/authorization.service.js"
import { getContext } from "../context/context.service.js"
import { publish } from "../event-bus/event-bus.js"
import { instrument } from "../observability/observability.service.js"
import {
  findWorkflowByKey,
  findPublishedVersion,
  findInstance,
  findInstanceWithHistory,
  createWorkflow as createWorkflowRecord,
  runTransaction,
  findTransition,
  updateInstanceStep,
  createHistory,
  findInstanceWithCurrentStep,
  createInstance,
} from "./workflow.repository.js"
import { WORKFLOW_ACTIONS } from "./workflow.constants.js"

const parsePermissionKey = (permissionKey) => {
  if (!permissionKey) return null

  const separator = permissionKey.indexOf(":")
  if (separator <= 0 || separator === permissionKey.length - 1) {
    throw new BadRequestError(`Invalid workflow permission key '${permissionKey}'.`)
  }

  return {
    resource: permissionKey.slice(0, separator),
    action: permissionKey.slice(separator + 1),
  }
}

const assertWorkflowDefinition = ({ steps = [], transitions = [] }) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new BadRequestError("A workflow version requires at least one step.")
  }

  if (!Array.isArray(transitions)) {
    throw new BadRequestError("Workflow transitions must be an array.")
  }

  const initialSteps = steps.filter((step) => step && step.isInitial)
  const finalSteps = steps.filter((step) => step && step.isFinal)

  if (initialSteps.length !== 1) {
    throw new BadRequestError(
      "A workflow version must have exactly one initial step.",
    )
  }

  if (finalSteps.length === 0) {
    throw new BadRequestError(
      "A workflow version requires at least one final step.",
    )
  }

  const keys = new Set()

  for (const step of steps) {
    if (!step || !step.key || !step.name) {
      throw new BadRequestError("Every workflow step requires a key and name.")
    }

    if (keys.has(step.key)) {
      throw new ConflictError(`Duplicate workflow step key: ${step.key}.`)
    }

    keys.add(step.key)
  }

  const stepKeys = new Set(steps.map((step) => step.key))
  const transitionKeys = new Set()
  const outgoing = new Map(steps.map((step) => [step.key, 0]))
  const adjacency = new Map(steps.map((step) => [step.key, []]))

  for (const transition of transitions) {
    if (!transition || !transition.key || !transition.name) {
      throw new BadRequestError(
        "Every workflow transition requires a key and name.",
      )
    }

    if (transitionKeys.has(transition.key)) {
      throw new ConflictError(
        `Duplicate workflow transition key: ${transition.key}.`,
      )
    }

    transitionKeys.add(transition.key)

    if (
      !stepKeys.has(transition.fromStepKey) ||
      !stepKeys.has(transition.toStepKey)
    ) {
      throw new BadRequestError(
        `Transition ${transition.key} references an unknown workflow step.`,
      )
    }

    if (transition.permissionKey) {
      parsePermissionKey(transition.permissionKey)
    }

    const fromStep = steps.find((step) => step.key === transition.fromStepKey)

    if (fromStep.isFinal) {
      throw new BadRequestError(
        `Final workflow step '${fromStep.key}' cannot have outgoing transitions.`,
      )
    }

    outgoing.set(fromStep.key, outgoing.get(fromStep.key) + 1)
    adjacency.get(fromStep.key).push(transition.toStepKey)
  }

  for (const step of steps) {
    if (!step.isFinal && outgoing.get(step.key) === 0) {
      throw new BadRequestError(
        `Non-final workflow step '${step.key}' must have at least one outgoing transition.`,
      )
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

  if (unreachable) {
    throw new BadRequestError(
      `Workflow step '${unreachable.key}' is unreachable from the initial step.`,
    )
  }
}

const assertTransitionPermission = async ({ transition, actorId }) => {
  if (!transition.permissionKey) return

  if (!actorId) {
    throw new ForbiddenError(
      "This workflow transition requires an authenticated actor.",
    )
  }

  const permission = parsePermissionKey(transition.permissionKey)
  const allowed = await can({ userId: actorId, ...permission })

  if (!allowed) {
    throw new ForbiddenError(`Missing permission '${transition.permissionKey}'.`)
  }
}

const resolveCorrelationId = () => getContext()?.correlationId || null

const createWorkflow = async ({
  key,
  name,
  description = null,
  steps,
  transitions = [],
  actorId = null,
}) => {
  if (!key || !name) {
    throw new BadRequestError("Workflow key and name are required.")
  }

  assertWorkflowDefinition({ steps, transitions })

  const existing = await findWorkflowByKey(key)
  if (existing) {
    throw new ConflictError(`Workflow '${key}' already exists.`)
  }

  const workflow = await createWorkflowRecord({
    key,
    name,
    description,
    steps,
    transitions,
  })

  await recordAudit({
    actorId,
    action: WORKFLOW_ACTIONS.CREATED,
    entityType: "Workflow",
    entityId: workflow.id,
    after: workflow,
  })

  return workflow
}

const startWorkflow = async ({
  workflowKey,
  subjectType,
  subjectId,
  actorId = null,
  metadata,
  db,
}) => {
  if (!subjectType || subjectId === undefined || subjectId === null) {
    throw new BadRequestError("subjectType and subjectId are required.")
  }

  const version = await findPublishedVersion(workflowKey, db)
  if (!version) {
    throw new NotFoundError(`Published workflow '${workflowKey}' was not found.`)
  }

  const initialStep = version.steps.find((step) => step.isInitial)
  if (!initialStep) {
    throw new BadRequestError("The published workflow has no initial step.")
  }

  const normalizedSubjectId = String(subjectId)
  const correlationId = resolveCorrelationId()

  const createInstanceRecord = async (tx) => {
    const created = await createInstance({
      workflowVersionId: version.id,
      currentStepId: initialStep.id,
      subjectType,
      subjectId: normalizedSubjectId,
      startedByUserId: actorId,
    }, tx)

    await createHistory({
      instanceId: created.id,
      toStepId: initialStep.id,
      actorId,
      correlationId,
      metadata: metadata || undefined,
    }, tx)

    await publish({
      db: tx,
      event: "workflow.started",
      entityType: subjectType,
      entityId: normalizedSubjectId,
      actorId,
      context: {
        workflowKey,
        workflowInstanceId: created.id,
        workflowStepKey: initialStep.key,
        metadata: metadata || {},
      },
      idempotencyKey: `workflow:${created.id}:started`,
    })

    return created
  }

  const instance = await runTransaction(createInstanceRecord, db)

  await recordAudit({
    actorId,
    action: WORKFLOW_ACTIONS.STARTED,
    entityType: "WorkflowInstance",
    entityId: instance.id,
    after: instance,
    metadata: {
      workflowKey,
      subjectType,
      subjectId: normalizedSubjectId,
      correlationId,
    },
    db,
  })

  return db ? instance : findInstance(instance.id)
}

const transitionWorkflow = async ({
  instanceId,
  transitionKey,
  actorId = null,
  metadata,
  db,
}) => {
  const instance = await findInstance(instanceId, db)

  if (!instance) {
    throw new NotFoundError("Workflow instance not found.")
  }

  if (instance.completedAt) {
    throw new ConflictError("Workflow instance is already completed.")
  }

  const transition = await findTransition(instance, transitionKey, db)

  if (!transition) {
    throw new BadRequestError(
      `Transition '${transitionKey}' is not available from step '${instance.currentStep.key}'.`,
    )
  }

  await assertTransitionPermission({ transition, actorId })

  const correlationId = resolveCorrelationId()

  const executeTransition = async (tx) => {
    const result = await updateInstanceStep(
      instanceId,
      instance.currentStepId,
      transition.toStepId,
      transition.toStep.isFinal ? new Date() : null,
      tx,
    )

    if (result.count !== 1) {
      throw new ConflictError(
        "Workflow instance changed concurrently. Retry the transition.",
      )
    }

    await createHistory({
      instanceId,
      fromStepId: instance.currentStepId,
      toStepId: transition.toStepId,
      transitionId: transition.id,
      actorId,
      correlationId,
      metadata: metadata || undefined,
    }, tx)

    await publish({
      db: tx,
      event: transition.toStep.isFinal
        ? "workflow.completed"
        : "workflow.transitioned",
      entityType: instance.subjectType,
      entityId: instance.subjectId,
      actorId,
      context: {
        workflowKey: instance.workflowVersion.workflow.key,
        workflowInstanceId: instanceId,
        workflowStepKey: transition.toStep.key,
        previousWorkflowStepKey: instance.currentStep.key,
        transitionKey,
        transitionId: transition.id,
        metadata: metadata || {},
      },
      idempotencyKey: `workflow:${instanceId}:transition:${transition.id}:${transition.toStepId}`,
    })

    return findInstanceWithCurrentStep(instanceId, tx)
  }

  const updated = await instrument(
    'workflow.transition',
    () => runTransaction(executeTransition, db),
    {
      metric: 'platform.workflow.transition',
      labels: {
        transition: transitionKey,
        workflow: instance.workflowVersion.workflow.key,
      },
    },
  )

  const action = transition.toStep.isFinal
    ? WORKFLOW_ACTIONS.COMPLETED
    : WORKFLOW_ACTIONS.TRANSITIONED

  await recordAudit({
    actorId,
    action,
    entityType: "WorkflowInstance",
    entityId: instanceId,
    before: {
      currentStepId: instance.currentStepId,
      currentStep: instance.currentStep.key,
    },
    after: {
      currentStepId: updated.currentStepId,
      currentStep: updated.currentStep.key,
    },
    metadata: {
      transitionKey,
      transitionId: transition.id,
      correlationId,
      ...metadata,
    },
    db,
  })

  return updated
}

const getWorkflowInstance = async (instanceId) => {
  const instance = await findInstanceWithHistory(instanceId)

  if (!instance) {
    throw new NotFoundError("Workflow instance not found.")
  }

  return instance
}

export {
  createWorkflow,
  startWorkflow,
  transitionWorkflow,
  getWorkflowInstance,
  assertTransitionPermission,
  assertWorkflowDefinition,
}
