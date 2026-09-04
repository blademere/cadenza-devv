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

export {
  workflowInclude,
  findWorkflowByKey,
  findPublishedVersion,
  findInstance,
  findInstanceWithHistory,
}
