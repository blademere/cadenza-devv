import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { BadRequestError } from '../../common/errors/appError.js'

const prisma = getPrismaClient()
const formVersionInclude = { sections: { orderBy: { sortOrder: 'asc' } }, fields: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, documentRequirements: { include: { documentType: true }, orderBy: { sortOrder: 'asc' } } }
const allVersionsInclude = { versions: { orderBy: { version: 'desc' }, include: formVersionInclude } }
const runTransaction = (operation, db = prisma) => db === prisma ? prisma.$transaction(operation) : operation(db)
const findById = (id, appId, db = prisma) => db.form.findFirst({ where: { id, appId } })
const findByKey = (key, appId, db = prisma) => db.form.findFirst({ where: { key, appId } })
const findByIdWithVersions = (id, appId, db = prisma) => db.form.findFirst({ where: { id, appId }, include: { versions: { select: { id: true, version: true, status: true }, orderBy: { version: 'desc' } } } })
const findByKeyWithDefinitions = (key, appId, db = prisma) => db.form.findFirst({ where: { key, appId }, include: allVersionsInclude })
const findVersionById = async (id, appId, db = prisma) => db.formVersion.findFirst({ where: { id, form: { appId } }, include: formVersionInclude })
const findVersion = (formId, version, appId, db = prisma) => db.formVersion.findFirst({ where: { formId, version, form: { appId } }, include: formVersionInclude })
const findVersionForUpdate = (formId, version, appId, db) => db.formVersion.findFirst({ where: { formId, version, form: { appId } } })
const findLatestFormVersion = (key, appId, db = prisma) => db.form.findFirst({ where: { key, appId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } })
const createFormRecord = (data, db) => db.form.create({ data })
const createVersionRecord = (data, db) => db.formVersion.create({ data })
const createDefinitionRecords = async (versionId, sections, fields, db) => {
  const sectionByKey = new Map()
  for (const [index, section] of sections.entries()) {
    const created = await db.formSection.create({ data: { formVersionId: versionId, key: section.key, title: section.title, description: section.description || null, sortOrder: section.sortOrder ?? index, visibility: section.visibility || undefined } })
    sectionByKey.set(section.key, created)
  }
  for (const [index, field] of fields.entries()) {
    const section = field.sectionKey ? sectionByKey.get(field.sectionKey) : null
    if (field.sectionKey && !section) throw new BadRequestError(`Field '${field.key}' references an unknown section.`)
    const created = await db.formField.create({ data: { formVersionId: versionId, sectionId: section?.id ?? null, key: field.key, label: field.label, description: field.description || null, type: field.type, sortOrder: field.sortOrder ?? index, required: Boolean(field.required), defaultValue: field.defaultValue ?? undefined, validation: field.validation || undefined, visibility: field.visibility || undefined, config: field.config || undefined } })
    if (field.options?.length) await db.formOption.createMany({ data: field.options.map((option, optionIndex) => ({ fieldId: created.id, value: String(option.value), label: option.label, sortOrder: option.sortOrder ?? optionIndex, metadata: option.metadata || undefined })) })
  }
}
const findVersionWithDefinition = (id, appId, db) => db.formVersion.findFirst({ where: { id, form: { appId } }, include: formVersionInclude })
const deleteFields = (formVersionId, db) => db.formField.deleteMany({ where: { formVersionId } })
const deleteSections = (formVersionId, db) => db.formSection.deleteMany({ where: { formVersionId } })
const updateVersion = (id, appId, data, db) => db.formVersion.updateMany({ where: { id, form: { appId } }, data })
const getUpdatedVersion = (id, appId, db) => db.formVersion.findFirst({ where: { id, form: { appId } }, include: formVersionInclude })
const archivePublishedVersions = (formId, appId, db) => db.formVersion.updateMany({ where: { formId, form: { appId }, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } })
const createSubmissionRecord = (data, db) => db.formSubmission.create({ data })
const findPublishedForm = (key, appId, db = prisma) => db.form.findFirst({ where: { key, appId }, include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1, include: formVersionInclude } } })

export { runTransaction, findById, findByKey, findByIdWithVersions, findByKeyWithDefinitions, findVersionById, findVersion, findVersionForUpdate, findLatestFormVersion, createFormRecord, createVersionRecord, createDefinitionRecords, findVersionWithDefinition, deleteFields, deleteSections, updateVersion, getUpdatedVersion, archivePublishedVersions, createSubmissionRecord, findPublishedForm }
