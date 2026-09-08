import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const publishedFormInclude = {
  versions: {
    where: { status: 'PUBLISHED' },
    orderBy: { version: 'desc' },
    take: 1,
    include: {
      sections: { orderBy: { sortOrder: 'asc' } },
      fields: {
        include: { options: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
      },
      documentRequirements: {
        include: { documentType: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  },
}

const formVersionInclude = {
  sections: { orderBy: { sortOrder: 'asc' } },
  fields: {
    include: { options: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  },
  documentRequirements: {
    include: { documentType: true },
    orderBy: { sortOrder: 'asc' },
  },
}

const listActive = () => prisma.oboPermitType.findMany({
  where: { isActive: true },
  include: { form: { include: publishedFormInclude } },
  orderBy: { name: 'asc' },
})

const findActiveById = (id, db = prisma) => db.oboPermitType.findFirst({
  where: { id, isActive: true },
  include: { form: { include: publishedFormInclude } },
})

const findById = (id, db = prisma) => db.oboPermitType.findUnique({
  where: { id },
})

const findByIdWithForm = (id, db = prisma) => db.oboPermitType.findUnique({
  where: { id },
  include: { form: true },
})

const findByKey = (key, db = prisma) => db.form.findUnique({
  where: { key },
})

const create = (data, db = prisma) => db.oboPermitType.create({ data })

const update = (id, data, db = prisma) => db.oboPermitType.update({
  where: { id },
  data,
})

const attachForm = (id, formId, db = prisma) => db.oboPermitType.update({
  where: { id },
  data: { formId },
  include: { form: true },
})

const withTransaction = (callback) => prisma.$transaction(callback)

const findPublishedFormVersion = (formId, version) => prisma.formVersion.findFirst({
  where: { formId, version, status: 'PUBLISHED' },
  include: formVersionInclude,
})

const findLatestDraftFormVersion = (formId) => prisma.formVersion.findFirst({
  where: { formId, status: 'DRAFT' },
  orderBy: { version: 'desc' },
  include: formVersionInclude,
})

export {
  listActive,
  findActiveById,
  findById,
  findByIdWithForm,
  findByKey,
  create,
  update,
  attachForm,
  withTransaction,
  findPublishedFormVersion,
  findLatestDraftFormVersion,
}
