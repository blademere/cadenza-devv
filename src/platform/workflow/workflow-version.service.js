const prisma = require("../../infrastructure/database/prisma")
const {
  BadRequestError,
  NotFoundError,
} = require("../../common/errors/appError")
const { recordAudit } = require("../audit/audit.service")
const { WORKFLOW_STATUS } = require("./workflow.constants")

const validateDefinition = ({ steps = [], transitions = [] }) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new BadRequestError("A workflow version requires at least one step.")
  }

  if (steps.filter((step) => step.isInitial).length !== 1) {
    throw new BadRequestError("A workflow version must have exactly one initial step.")
  }

  const keys = new Set(steps.map((step) => step.key))
  if (keys.size !== steps.length || steps.some((step) => !step.key || !step.name)) {
    throw new BadRequestError("Workflow steps require unique keys and names.")
  }

  const transitionKeys = new Set()
  for (const transition of transitions) {
    if (!transition.key || !transition.name) {
      throw new BadRequestError("Workflow transitions require keys and names.")
    }
    if (transitionKeys.has(transition.key)) {
      throw new BadRequestError(`Duplicate workflow transition key: ${transition.key}.`)
    }
    transitionKeys.add(transition.key)
    if (!keys.has(transition.fromStepKey) || !keys.has(transition.toStepKey)) {
      throw new BadRequestError(`Transition ${transition.key} references an unknown step.`)
    }
  }
}

const createWorkflowVersion = async ({ workflowKey, steps, transitions = [], actorId = null }) => {
  validateDefinition({ steps, transitions })

  const workflow = await prisma.workflow.findUnique({ where: { key: workflowKey } })
  if (!workflow) {
    throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)
  }

  const version = await prisma.$transaction(async (tx) => {
    const latest = await tx.workflowVersion.findFirst({
      where: { workflowId: workflow.id },
      orderBy: { version: "desc" },
      select: { version: true },
    })

    const created = await tx.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        version: (latest?.version || 0) + 1,
        status: WORKFLOW_STATUS.DRAFT,
        steps: {
          create: steps.map((step, index) => ({
            key: step.key,
            name: step.name,
            description: step.description || null,
            sortOrder: step.sortOrder ?? index,
            isInitial: Boolean(step.isInitial),
            isFinal: Boolean(step.isFinal),
          })),
        },
      },
      include: { steps: true },
    })

    const stepByKey = new Map(created.steps.map((step) => [step.key, step]))
    for (const transition of transitions) {
      await tx.workflowTransition.create({
        data: {
          workflowVersionId: created.id,
          fromStepId: stepByKey.get(transition.fromStepKey).id,
          toStepId: stepByKey.get(transition.toStepKey).id,
          key: transition.key,
          name: transition.name,
          description: transition.description || null,
          permissionKey: transition.permissionKey || null,
        },
      })
    }

    return tx.workflowVersion.findUnique({
      where: { id: created.id },
      include: { steps: true, transitions: true },
    })
  })

  await recordAudit({
    actorId,
    action: "VERSION_CREATED",
    entityType: "WorkflowVersion",
    entityId: version.id,
    after: version,
    metadata: { workflowKey, version: version.version },
  })

  return version
}

const publishWorkflowVersion = async ({ workflowKey, version, actorId = null }) => {
  const workflow = await prisma.workflow.findUnique({ where: { key: workflowKey } })
  if (!workflow) {
    throw new NotFoundError(`Workflow '${workflowKey}' was not found.`)
  }

  const target = await prisma.workflowVersion.findUnique({
    where: { workflowId_version: { workflowId: workflow.id, version } },
    include: { steps: true, transitions: true },
  })
  if (!target) {
    throw new NotFoundError(`Workflow '${workflowKey}' version ${version} was not found.`)
  }

  if (target.status === WORKFLOW_STATUS.PUBLISHED) return target

  const published = await prisma.$transaction(async (tx) => {
    await tx.workflowVersion.updateMany({
      where: { workflowId: workflow.id, status: WORKFLOW_STATUS.PUBLISHED },
      data: { status: WORKFLOW_STATUS.ARCHIVED },
    })

    return tx.workflowVersion.update({
      where: { id: target.id },
      data: { status: WORKFLOW_STATUS.PUBLISHED },
      include: { steps: true, transitions: true },
    })
  })

  await recordAudit({
    actorId,
    action: "VERSION_PUBLISHED",
    entityType: "WorkflowVersion",
    entityId: published.id,
    after: published,
    metadata: { workflowKey, version: published.version },
  })

  return published
}

module.exports = {
  createWorkflowVersion,
  publishWorkflowVersion,
}
