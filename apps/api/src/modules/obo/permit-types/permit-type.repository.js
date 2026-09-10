import { getPrismaClient } from '../../../infrastructure/database/prisma.js'
import * as formRepository from '../../../platform/forms/form.repository.js'

const prisma = getPrismaClient()

const withForm = async (permitType, db = prisma, include = 'published') => ({
  ...permitType,
  form: permitType.formId
    ? include === 'published'
      ? await formRepository.findByIdWithDefinition(permitType.formId, db)
      : await formRepository.findById(permitType.formId, db)
    : null,
})

const listActive = async (db = prisma) => {
  const permitTypes = await db.oboPermitType.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  return Promise.all(permitTypes.map((permitType) => withForm(permitType, db)))
}

const findActiveById = async (id, db = prisma) => {
  const permitType = await db.oboPermitType.findFirst({ where: { id, isActive: true } })
  return permitType ? withForm(permitType, db) : null
}

const findById = (id, db = prisma) => db.oboPermitType.findUnique({ where: { id } })

const findByIdWithForm = async (id, db = prisma) => {
  const permitType = await findById(id, db)
  return permitType ? withForm(permitType, db, 'all') : null
}

const findByKey = (key, db = prisma) => db.oboPermitType.findUnique({ where: { key } })
const create = (data, db = prisma) => db.oboPermitType.create({ data })
const update = (id, data, db = prisma) => db.oboPermitType.update({ where: { id }, data })

const attachForm = async (id, formId, db = prisma) => {
  const permitType = await db.oboPermitType.update({ where: { id }, data: { formId } })
  return withForm(permitType, db, 'all')
}

const withTransaction = (callback) => prisma.$transaction(callback)

const findPublishedFormVersion = (formId, version, db = prisma) => formRepository.findPublishedVersion(formId, version, db)
const findLatestDraftFormVersion = (formId, db = prisma) => formRepository.findLatestDraftVersion(formId, db)

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
