import { getPrismaClient } from "../../infrastructure/database/prisma.js"

const prisma = getPrismaClient()

const runTransaction = (operation, db = prisma) =>
  db === prisma ? prisma.$transaction(operation) : operation(db)

const findWorkflowByKey = (workflowKey, db = prisma) =>
  db.workflow.findUnique({ where: { key: workflowKey } })

const findVersion = (workflowId, version, db = prisma) =>
  db.workflowVersion.findUnique({
    where: { workflowId_version: { workflowId, version } },
    include: { steps: true, transitions: true },
  })

const findLatestVersionNumber = (workflowId, db) =>
  db.workflowVersion.findFirst({
    where: { workflowId },
    orderBy: { version: "desc" },
    select: { version: true },
  })

const createVersion = ({ workflowId, steps, transitions, version }, db) =>
  db.workflowVersion.create({
    data: {
      workflowId,
      version,
      status: "DRAFT",
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

const createTransition = (data, db) => db.workflowTransition.create({ data })

const findVersionWithRelations = (id, db = prisma) =>
  db.workflowVersion.findUnique({
    where: { id },
    include: { steps: true, transitions: true },
  })

const updateValidated = (id, db) =>
  db.workflowVersion.updateMany({
    where: { id, status: "DRAFT" },
    data: { status: "VALIDATED" },
  })

const findPublishedVersion = (workflowId, db) =>
  db.workflowVersion.findFirst({
    where: { workflowId, status: "PUBLISHED" },
    select: { id: true },
  })

const archiveVersion = (id, db) =>
  db.workflowVersion.update({
    where: { id },
    data: { status: "ARCHIVED" },
  })

const publishValidated = (id, db) =>
  db.workflowVersion.updateMany({
    where: { id, status: "VALIDATED" },
    data: { status: "PUBLISHED" },
  })

const archivePublished = (id, db) =>
  db.workflowVersion.update({
    where: { id, status: "PUBLISHED" },
    data: { status: "ARCHIVED" },
  })

const publishArchived = (id, db) =>
  db.workflowVersion.updateMany({
    where: { id, status: "ARCHIVED" },
    data: { status: "PUBLISHED" },
  })

export {
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
}
