import { getPrismaClient } from "../../infrastructure/database/prisma.js"

const prisma = getPrismaClient()

const workflowInclude = {
  versions: {
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
      },
      transitions: true,
    },
    orderBy: { version: "desc" },
  },
}

const runTransaction = (operation, db = prisma) =>
  db === prisma ? prisma.$transaction(operation) : operation(db)

const findWorkflowByKey = (key, db = prisma) =>
  db.workflow.findUnique({
    where: { key },
    include: workflowInclude,
  })

const findPublishedVersion = (key, db = prisma) =>
  db.workflowVersion.findFirst({
    where: {
      workflow: { key, isActive: true },
      status: "PUBLISHED",
    },
    orderBy: { version: "desc" },
    include: {
      workflow: true,
      steps: { orderBy: { sortOrder: "asc" } },
      transitions: true,
    },
  })

const findInstance = (id, db = prisma) =>
  db.workflowInstance.findUnique({
    where: { id },
    include: {
      workflowVersion: { include: { workflow: true } },
      currentStep: true,
    },
  })

const findInstancesByIds = (ids, db = prisma) =>
  db.workflowInstance.findMany({
    where: { id: { in: ids } },
    include: { currentStep: true },
  })

const findInstanceWithHistory = (id, db = prisma) =>
  db.workflowInstance.findUnique({
    where: { id },
    include: {
      workflowVersion: { include: { workflow: true } },
      currentStep: true,
      history: {
        include: {
          fromStep: true,
          toStep: true,
          transition: true,
          actor: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

const createWorkflow = async ({
  key,
  name,
  description,
  steps,
  transitions,
}, db = prisma) => {
  const execute = async (tx) => {
    const created = await tx.workflow.create({
      data: {
        key,
        name,
        description,
        versions: {
          create: {
            version: 1,
            status: "PUBLISHED",
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
        },
      },
      include: {
        versions: {
          include: { steps: true },
        },
      },
    })

    const version = created.versions[0]
    const stepByKey = new Map(version.steps.map((step) => [step.key, step]))

    for (const transition of transitions) {
      await tx.workflowTransition.create({
        data: {
          workflowVersionId: version.id,
          fromStepId: stepByKey.get(transition.fromStepKey).id,
          toStepId: stepByKey.get(transition.toStepKey).id,
          key: transition.key,
          name: transition.name,
          description: transition.description || null,
          permissionKey: transition.permissionKey || null,
        },
      })
    }

    return tx.workflow.findUnique({
      where: { id: created.id },
      include: {
        versions: {
          include: { steps: true, transitions: true },
          orderBy: { version: "desc" },
        },
      },
    })
  }

  return runTransaction(execute, db)
}

const findTransition = (instance, transitionKey, db = prisma) =>
  db.workflowTransition.findFirst({
    where: {
      workflowVersionId: instance.workflowVersionId,
      fromStepId: instance.currentStepId,
      key: transitionKey,
    },
    include: { toStep: true },
  })

const updateInstanceStep = (instanceId, expectedStepId, toStepId, completedAt, db) =>
  db.workflowInstance.updateMany({
    where: {
      id: instanceId,
      currentStepId: expectedStepId,
      completedAt: null,
    },
    data: {
      currentStepId: toStepId,
      completedAt,
    },
  })

const createHistory = (data, db) => db.workflowHistory.create({ data })

const findInstanceWithCurrentStep = (id, db) =>
  db.workflowInstance.findUnique({
    where: { id },
    include: { currentStep: true },
  })

const createInstance = async ({
  workflowVersionId,
  currentStepId,
  subjectType,
  subjectId,
  startedByUserId,
}, db) => db.workflowInstance.create({
  data: {
    workflowVersionId,
    currentStepId,
    subjectType,
    subjectId,
    startedByUserId,
  },
})

export {
  workflowInclude,
  runTransaction,
  findWorkflowByKey,
  findPublishedVersion,
  findInstance,
  findInstancesByIds,
  findInstanceWithHistory,
  createWorkflow,
  findTransition,
  updateInstanceStep,
  createHistory,
  findInstanceWithCurrentStep,
  createInstance,
}
