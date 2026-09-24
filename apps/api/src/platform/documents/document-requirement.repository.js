import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findFormVersion = (id, db = prisma) =>
  db.formVersion.findUnique({ where: { id }, include: { fields: { select: { key: true } } } })

const findWorkflowVersion = (id, db = prisma) =>
  db.workflowVersion.findUnique({ where: { id }, include: { steps: { select: { key: true } } } })

const createRequirement = (data, db = prisma) => db.documentRequirement.create({ data })
const findRequirement = (id, db = prisma) => db.documentRequirement.findUnique({ where: { id } })
const updateRequirement = (id, data, db = prisma) => db.documentRequirement.update({ where: { id }, data })
const deleteRequirement = (id, db = prisma) => db.documentRequirement.delete({ where: { id } })

const listForFormVersion = (formVersionId, db = prisma) =>
  db.documentRequirement.findMany({
    where: { formVersionId },
    include: { documentType: true },
    orderBy: { sortOrder: 'asc' },
  })

export {
  findFormVersion,
  findWorkflowVersion,
  createRequirement,
  findRequirement,
  updateRequirement,
  deleteRequirement,
  listForFormVersion,
}
