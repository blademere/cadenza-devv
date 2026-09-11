import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()
const publishedFormInclude = { versions: { where: { status: 'PUBLISHED' }, orderBy: { version: 'desc' }, take: 1, include: { sections: { orderBy: { sortOrder: 'asc' } }, fields: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, documentRequirements: { include: { documentType: true }, orderBy: { sortOrder: 'asc' } } } } }
const formVersionInclude = { sections: { orderBy: { sortOrder: 'asc' } }, fields: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, documentRequirements: { include: { documentType: true }, orderBy: { sortOrder: 'asc' } } }
const runTransaction = (operation, db = prisma) => db === prisma ? prisma.$transaction(operation) : operation(db)
const findById = (id, db = prisma) => db.form.findUnique({ where: { id } })
const findByKey = (key, db = prisma) => db.form.findUnique({ where: { key } })
const findByIdWithDefinition = (id, db = prisma) => db.form.findUnique({ where: { id }, include: { ...publishedFormInclude, versions: { include: { sections: { orderBy: { sortOrder: 'asc' } }, fields: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }, documentRequirements: { include: { documentType: true }, orderBy: { sortOrder: 'asc' } } }, orderBy: { version: 'desc' } } } })
const findVersionById = (id, db = prisma) => db.formVersion.findUnique({ where: { id }, include: { form: true } })
const findVersion = (formId, version, db = prisma) => db.formVersion.findUnique({ where: { formId_version: { formId, version } }, include: formVersionInclude })
const findPublishedVersion = (formId, version, db = prisma) => db.formVersion.findFirst({ where: { formId, version, status: 'PUBLISHED' }, include: formVersionInclude })
const findLatestDraftVersion = (formId, db = prisma) => db.formVersion.findFirst({ where: { formId, status: 'DRAFT' }, orderBy: { version: 'desc' }, include: formVersionInclude })
const findFormWithLatestVersion = (key, db = prisma) => db.form.findUnique({ where: { key }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } })
const findFormWithDefinition = (key, db = prisma) => db.form.findUnique({ where: { key }, include: { versions: { orderBy: { version: 'desc' }, include: formVersionInclude } } })
const createFormRecord = (data, db = prisma) => db.form.create({ data })
const createVersionRecord = (data, db = prisma) => db.formVersion.create({ data })
const createSectionRecord = (data, db) => db.formSection.create({ data })
const createFieldRecord = (data, db) => db.formField.create({ data })
const createOptions = (data, db) => db.formOption.createMany({ data })
const deleteFields = (where, db) => db.formField.deleteMany({ where })
const deleteSections = (where, db) => db.formSection.deleteMany({ where })
const findFormWithDefinitionById = (id, db = prisma) => db.form.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, include: formVersionInclude } } })
const updateVersion = (id, data, db) => db.formVersion.update({ where: { id }, data, include: formVersionInclude })
const archivePublishedVersions = (formId, db) => db.formVersion.updateMany({ where: { formId, status: 'PUBLISHED' }, data: { status: 'ARCHIVED' } })
const findVersionForUpdate = (formId, version, db) => db.formVersion.findUnique({ where: { formId_version: { formId, version } } })
const findVersionWithDefinition = (id, db) => db.formVersion.findUnique({ where: { id }, include: formVersionInclude })
const createSubmissionRecord = (data, db) => db.formSubmission.create({ data })

export { runTransaction, findById, findByKey, findByIdWithDefinition, findVersionById, findVersion, findPublishedVersion, findLatestDraftVersion, findFormWithLatestVersion, findFormWithDefinition, findFormWithDefinitionById, createFormRecord, createVersionRecord, createSectionRecord, createFieldRecord, createOptions, deleteFields, deleteSections, updateVersion, archivePublishedVersions, findVersionForUpdate, findVersionWithDefinition, createSubmissionRecord, formVersionInclude }
