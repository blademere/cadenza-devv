import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import { recordAudit } from '../audit/audit.service.js'
import { publish } from '../event-bus/event-bus.js'
import { FORM_STATUS } from './form.constants.js'
import {
  evaluateCondition,
  validateFieldValue,
  validateDefinition,
  isSafeRegexPattern,
} from './form.validation.js'

const prisma = getPrismaClient()

const includeDefinition = {
  versions: {
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
    orderBy: { version: 'desc' },
  },
}

const createDefinitionRecords = async (tx, versionId, sections, fields) => {
  const sectionByKey = new Map()

  for (const [index, section] of sections.entries()) {
    const created = await tx.formSection.create({
      data: {
        formVersionId: versionId,
        key: section.key,
        title: section.title,
        description: section.description || null,
        sortOrder: section.sortOrder ?? index,
        visibility: section.visibility || undefined,
      },
    })
    sectionByKey.set(section.key, created)
  }

  for (const [index, field] of fields.entries()) {
    const created = await tx.formField.create({
      data: {
        formVersionId: versionId,
        sectionId: field.sectionKey ? sectionByKey.get(field.sectionKey).id : null,
        key: field.key,
        label: field.label,
        description: field.description || null,
        type: field.type,
        sortOrder: field.sortOrder ?? index,
        required: Boolean(field.required),
        defaultValue: field.defaultValue ?? undefined,
        validation: field.validation || undefined,
        visibility: field.visibility || undefined,
        config: field.config || undefined,
      },
    })

    if (field.options?.length) {
      await tx.formOption.createMany({
        data: field.options.map((option, optionIndex) => ({
          fieldId: created.id,
          value: String(option.value),
          label: option.label,
          sortOrder: option.sortOrder ?? optionIndex,
          metadata: option.metadata || undefined,
        })),
      })
    }
  }
}

const createForm = async ({
  key,
  name,
  description = null,
  entityType = null,
  sections = [],
  fields,
  actorId = null,
}) => {
  if (!key || !name) throw new BadRequestError('Form key and name are required.')
  validateDefinition({ sections, fields })
  if (await prisma.form.findUnique({ where: { key } })) {
    throw new ConflictError(`Form '${key}' already exists.`)
  }

  const form = await prisma.$transaction(async (tx) => {
    const created = await tx.form.create({ data: { key, name, description, entityType } })
    const version = await tx.formVersion.create({
      data: { formId: created.id, version: 1, status: FORM_STATUS.PUBLISHED },
    })
    await createDefinitionRecords(tx, version.id, sections, fields)
    return tx.form.findUnique({ where: { id: created.id }, include: includeDefinition })
  })

  await recordAudit({ actorId, action: 'FORM_CREATED', entityType: 'Form', entityId: form.id, after: form })
  return form
}

const createFormVersion = async ({ formKey, sections = [], fields, actorId = null }) => {
  const form = await prisma.form.findUnique({
    where: { key: formKey },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  })
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)

  validateDefinition({ sections, fields })
  const versionNumber = (form.versions[0]?.version || 0) + 1
  const version = await prisma.$transaction(async (tx) => {
    const created = await tx.formVersion.create({
      data: { formId: form.id, version: versionNumber, status: FORM_STATUS.DRAFT },
    })
    await createDefinitionRecords(tx, created.id, sections, fields)
    return tx.formVersion.findUnique({
      where: { id: created.id },
      include: { sections: true, fields: { include: { options: true } } },
    })
  })

  await recordAudit({
    actorId,
    action: 'FORM_VERSION_CREATED',
    entityType: 'FormVersion',
    entityId: version.id,
    after: version,
  })
  return version
}

const publishFormVersion = async ({ formKey, version, actorId = null }) => {
  const form = await prisma.form.findUnique({ where: { key: formKey } })
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)

  const published = await prisma.$transaction(async (tx) => {
    const target = await tx.formVersion.findUnique({
      where: { formId_version: { formId: form.id, version } },
    })
    if (!target) throw new NotFoundError(`Form version ${version} was not found.`)
    if (target.status !== FORM_STATUS.DRAFT) {
      throw new ConflictError('Only draft form versions can be published.')
    }

    await tx.formVersion.updateMany({
      where: { formId: form.id, status: FORM_STATUS.PUBLISHED },
      data: { status: FORM_STATUS.ARCHIVED },
    })
    return tx.formVersion.update({
      where: { id: target.id },
      data: { status: FORM_STATUS.PUBLISHED },
      include: { sections: true, fields: { include: { options: true } } },
    })
  })

  await recordAudit({
    actorId,
    action: 'FORM_VERSION_PUBLISHED',
    entityType: 'FormVersion',
    entityId: published.id,
    after: published,
  })
  return published
}

const getPublishedForm = async (formKey) => {
  const form = await prisma.form.findUnique({ where: { key: formKey }, include: includeDefinition })
  if (!form || !form.isActive) throw new NotFoundError(`Active form '${formKey}' was not found.`)

  const version = form.versions.find((item) => item.status === FORM_STATUS.PUBLISHED)
  if (!version) throw new NotFoundError(`Published form '${formKey}' was not found.`)
  return { ...form, versions: [version] }
}

const validateFormValues = async ({ formKey, version, values }) => {
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    throw new BadRequestError('Form values must be an object.')
  }

  const form = await prisma.form.findUnique({ where: { key: formKey }, include: includeDefinition })
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)

  const formVersion =
    version == null
      ? form.versions.find((item) => item.status === FORM_STATUS.PUBLISHED)
      : form.versions.find((item) => item.version === version)
  if (!formVersion) throw new NotFoundError('Form version was not found.')

  const errors = formVersion.fields.flatMap((field) => validateFieldValue(field, values[field.key], values))
  return { valid: errors.length === 0, errors, formVersionId: formVersion.id }
}

const submitForm = async ({
  formKey,
  version,
  values,
  subjectType = null,
  subjectId = null,
  submittedByUserId = null,
}) => {
  const result = await validateFormValues({ formKey, version, values })
  if (!result.valid) throw new BadRequestError('Form validation failed.', result.errors)

  const normalizedSubjectId = subjectId == null ? null : String(subjectId)
  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.formSubmission.create({
      data: {
        formVersionId: result.formVersionId,
        subjectType,
        subjectId: normalizedSubjectId,
        submittedByUserId,
        status: 'SUBMITTED',
        values,
        submittedAt: new Date(),
      },
    })

    await publish({
      db: tx,
      event: 'form.submitted',
      entityType: subjectType || 'FormSubmission',
      entityId: normalizedSubjectId || created.id,
      actorId: submittedByUserId,
      context: { formSubmissionId: created.id, formVersionId: result.formVersionId, formKey },
      idempotencyKey: `form-submission:${created.id}`,
    })
    return created
  })

  await recordAudit({
    actorId: submittedByUserId,
    action: 'FORM_SUBMITTED',
    entityType: 'FormSubmission',
    entityId: submission.id,
    after: submission,
  })
  return submission
}

export {
  createForm,
  createFormVersion,
  publishFormVersion,
  getPublishedForm,
  validateFormValues,
  submitForm,
  evaluateCondition,
  validateFieldValue,
  validateDefinition,
  isSafeRegexPattern,
}
