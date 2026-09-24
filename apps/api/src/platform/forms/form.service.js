import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors/appError.js'
import { recordAudit } from '../audit/audit.service.js'
import { publish } from '../event-bus/event-bus.js'
import { FORM_STATUS } from './form.constants.js'
import { evaluateCondition, validateFieldValue, validateDefinition, isSafeRegexPattern } from './form.validation.js'
import {
  runTransaction, findById, findByIdWithVersions, findVersionById, findByKey, findVersion, findVersionForUpdate,
  findLatestFormVersion, findByKeyWithDefinitions, createFormRecord, createVersionRecord, createDefinitionRecords,
  findVersionWithDefinition, deleteFields, deleteSections, updateVersion, getUpdatedVersion, archivePublishedVersions, createSubmissionRecord, findPublishedForm,
} from './form.repository.js'

const requireAppId = (appId) => {
  if (!appId) throw new BadRequestError('Application context is required for forms.')
  return appId
}

const createForm = async ({ appId, key, name, description = null, entityType = null, sections = [], fields, actorId = null, db }) => {
  requireAppId(appId)
  if (!key || !name) throw new BadRequestError('Form key and name are required.')
  validateDefinition({ sections, fields })
  const existing = await findByKey(key, appId, db)
  if (existing) throw new ConflictError(`Form '${key}' already exists.`)
  const form = await runTransaction(async (tx) => {
    const created = await createFormRecord({ appId, key, name, description, entityType }, tx)
    const version = await createVersionRecord({ formId: created.id, version: 1, status: FORM_STATUS.DRAFT }, tx)
    await createDefinitionRecords(version.id, sections, fields, tx)
    return findByKeyWithDefinitions(key, appId, tx)
  }, db)
  if (!db) await recordAudit({ actorId, appId, action: 'FORM_CREATED', entityType: 'Form', entityId: form.id, after: form })
  return form
}

const createFormVersion = async ({ appId, formKey, sections = [], fields, actorId = null }) => {
  requireAppId(appId)
  const form = await findLatestFormVersion(formKey, appId)
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)
  validateDefinition({ sections, fields })
  const versionNumber = (form.versions[0]?.version || 0) + 1
  const version = await runTransaction(async (tx) => {
    const created = await createVersionRecord({ formId: form.id, version: versionNumber, status: FORM_STATUS.DRAFT }, tx)
    await createDefinitionRecords(created.id, sections, fields, tx)
    return findVersionWithDefinition(created.id, appId, tx)
  })
  await recordAudit({ actorId, appId, action: 'FORM_VERSION_CREATED', entityType: 'FormVersion', entityId: version.id, after: version })
  return version
}

const getFormById = async (id, appId, db) => findById(id, requireAppId(appId), db)
const getFormByIdWithVersions = async (id, appId, db) => findByIdWithVersions(id, requireAppId(appId), db)
const getFormVersionById = async (id, appId, db) => findVersionById(id, requireAppId(appId), db)

const getFormVersion = async ({ formKey, version, appId }) => {
  requireAppId(appId)
  const form = await findByKey(formKey, appId)
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)
  const formVersion = await findVersion(form.id, version, appId)
  if (!formVersion) throw new NotFoundError(`Form version ${version} was not found.`)
  return formVersion
}

const updateFormVersion = async ({ appId, formKey, version, sections = [], fields, actorId = null }) => {
  requireAppId(appId)
  const form = await findByKey(formKey, appId)
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)
  validateDefinition({ sections, fields })
  const updated = await runTransaction(async (tx) => {
    const target = await findVersionForUpdate(form.id, version, appId, tx)
    if (!target) throw new NotFoundError(`Form version ${version} was not found.`)
    if (target.status !== FORM_STATUS.DRAFT) throw new ConflictError('Only draft form versions can be updated.')
    await deleteFields(target.id, tx)
    await deleteSections(target.id, tx)
    await createDefinitionRecords(target.id, sections, fields, tx)
    return findVersionWithDefinition(target.id, appId, tx)
  })
  await recordAudit({ actorId, appId, action: 'FORM_VERSION_UPDATED', entityType: 'FormVersion', entityId: updated.id, after: updated })
  return updated
}

const publishFormVersion = async ({ appId, formKey, version, actorId = null }) => {
  requireAppId(appId)
  const form = await findByKey(formKey, appId)
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)
  const published = await runTransaction(async (tx) => {
    const target = await findVersionForUpdate(form.id, version, appId, tx)
    if (!target) throw new NotFoundError(`Form version ${version} was not found.`)
    if (target.status !== FORM_STATUS.DRAFT) throw new ConflictError('Only draft form versions can be published.')
    await archivePublishedVersions(form.id, appId, tx)
    await updateVersion(target.id, appId, { status: FORM_STATUS.PUBLISHED }, tx)
    return getUpdatedVersion(target.id, appId, tx)
  })
  await recordAudit({ actorId, appId, action: 'FORM_VERSION_PUBLISHED', entityType: 'FormVersion', entityId: published.id, after: published })
  return published
}

const getPublishedForm = async (formKey, appId) => {
  requireAppId(appId)
  const form = await findPublishedForm(formKey, appId)
  if (!form || !form.isActive) throw new NotFoundError(`Active form '${formKey}' was not found.`)
  const version = form.versions[0]
  if (!version) throw new NotFoundError(`Published form '${formKey}' was not found.`)
  return { ...form, versions: [version] }
}

const validateFormValues = async ({ formKey, version, values, requireRequired = true, appId }) => {
  requireAppId(appId)
  if (values === null || typeof values !== 'object' || Array.isArray(values)) throw new BadRequestError('Form values must be an object.')
  const form = await findByKeyWithDefinitions(formKey, appId)
  if (!form) throw new NotFoundError(`Form '${formKey}' was not found.`)
  const formVersion = version == null ? form.versions.find((item) => item.status === FORM_STATUS.PUBLISHED) : form.versions.find((item) => item.version === version)
  if (!formVersion) throw new NotFoundError('Form version was not found.')
  const errors = formVersion.fields.flatMap((field) => validateFieldValue(field, values[field.key], values, { requireRequired }))
  return { valid: errors.length === 0, errors, formVersionId: formVersion.id }
}

const submitForm = async ({ appId, formKey, version, values, subjectType = null, subjectId = null, submittedByUserId = null }) => {
  requireAppId(appId)
  const result = await validateFormValues({ appId, formKey, version, values })
  if (!result.valid) throw new BadRequestError('Form validation failed.', result.errors)
  const normalizedSubjectId = subjectId == null ? null : String(subjectId)
  const submission = await runTransaction(async (tx) => {
    const created = await createSubmissionRecord({ formVersionId: result.formVersionId, subjectType, subjectId: normalizedSubjectId, submittedByUserId, status: 'SUBMITTED', values, submittedAt: new Date() }, tx)
    await publish({ db: tx, event: 'form.submitted', entityType: subjectType || 'FormSubmission', entityId: normalizedSubjectId || created.id, actorId: submittedByUserId, context: { appId, formSubmissionId: created.id, formVersionId: result.formVersionId, formKey }, idempotencyKey: `form-submission:${created.id}` })
    return created
  })
  await recordAudit({ actorId: submittedByUserId, appId, action: 'FORM_SUBMITTED', entityType: 'FormSubmission', entityId: submission.id, after: submission })
  return submission
}

export { createForm, createFormVersion, getFormById, getFormByIdWithVersions, getFormVersionById, getFormVersion, updateFormVersion, publishFormVersion, getPublishedForm, validateFormValues, submitForm, evaluateCondition, validateFieldValue, validateDefinition, isSafeRegexPattern }
