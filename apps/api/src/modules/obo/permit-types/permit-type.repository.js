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

const findActiveById = (id) => prisma.oboPermitType.findFirst({
  where: { id, isActive: true },
  include: { form: { include: publishedFormInclude } },
})

const findPublishedFormVersion = (formId, version) => prisma.formVersion.findFirst({
  where: { formId, version, status: 'PUBLISHED' },
  include: formVersionInclude,
})

export { listActive, findActiveById, findPublishedFormVersion }
