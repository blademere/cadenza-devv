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

const getForm = (formId, db = prisma, include = publishedFormInclude) => formId
  ? db.form.findUnique({ where: { id: formId }, include })
  : Promise.resolve(null)

const withForm = async (permitType, db = prisma, include = publishedFormInclude) => ({
  ...permitType,
  form: await getForm(permitType.formId, db, include),
})

const listActive = async (db = prisma) => {
  const permitTypes = await db.oboPermitType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
  return Promise.all(permitTypes.map((permitType) => withForm(permitType, db)))
}

const findActiveById = async (id, db = prisma) => {
  const permitType = await db.oboPermitType.findFirst({
    where: { id, isActive: true },
  })
  return permitType ? withForm(permitType, db) : null
}

const findById = (id, db = prisma) => db.oboPermitType.findUnique({
  where: { id },
})

const findByIdWithForm = async (id, db = prisma) => {
  const permitType = await findById(id, db)
  return permitType ? withForm(permitType, db, { versions: true }) : null
}

const findByKey = (key, db = prisma) => db.oboPermitType.findUnique({
  where: { key },
})

const create = (data, db = prisma) => db.oboPermitType.create({ data })

const update = (id, data, db = prisma) => db.oboPermitType.update({
  where: { id },
  data,
})

const attachForm = async (id, formId, db = prisma) => {
  const permitType = await db.oboPermitType.update({
    where: { id },
    data: { formId },
  })
  return withForm(permitType, db, { versions: true })
}

const withTransaction = (callback) => prisma.$transaction(callback)

const findPublishedFormVersion = (formId, version, db = prisma) => db.formVersion.findFirst({
  where: { formId, version, status: 'PUBLISHED' },
  include: formVersionInclude,
})

const findLatestDraftFormVersion = (formId, db = prisma) => db.formVersion.findFirst({
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
