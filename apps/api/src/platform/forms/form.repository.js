import { getPrismaClient } from '../../infrastructure/database/prisma.js'

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

const findById = (id, db = prisma) => db.form.findUnique({ where: { id } })
const findByKey = (key, db = prisma) => db.form.findUnique({ where: { key } })

const findByIdWithDefinition = (id, db = prisma) => db.form.findUnique({
  where: { id },
  include: publishedFormInclude,
})

const findVersionById = (id, db = prisma) => db.formVersion.findUnique({
  where: { id },
  include: { form: true },
})

const findVersion = (formId, version, db = prisma) => db.formVersion.findUnique({
  where: { formId_version: { formId, version } },
  include: formVersionInclude,
})

const findPublishedVersion = (formId, version, db = prisma) => db.formVersion.findFirst({
  where: { formId, version, status: 'PUBLISHED' },
  include: formVersionInclude,
})

const findLatestDraftVersion = (formId, db = prisma) => db.formVersion.findFirst({
  where: { formId, status: 'DRAFT' },
  orderBy: { version: 'desc' },
  include: formVersionInclude,
})

export {
  findById,
  findByKey,
  findByIdWithDefinition,
  findVersionById,
  findVersion,
  findPublishedVersion,
  findLatestDraftVersion,
}
