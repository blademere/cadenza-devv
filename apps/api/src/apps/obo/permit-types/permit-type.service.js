import { ConflictError, NotFoundError } from '../../../common/errors/appError.js'
import { recordAudit } from '../../../platform/audit/audit.service.js'
import * as formService from '../../../platform/forms/form.service.js'
import * as repository from './permit-type.repository.js'

const toFormResponse = (permitType, formVersion) => ({
  id: permitType.form.id,
  key: permitType.form.key,
  name: permitType.form.name,
  description: permitType.form.description,
  version: formVersion.version,
  status: formVersion.status,
  formVersionId: formVersion.id,
  sections: formVersion.sections,
  fields: formVersion.fields,
  documentRequirements: formVersion.documentRequirements,
})

const hydratePermitType = async (permitType) => {
  if (!permitType) return permitType
  const form = permitType.formId ? await formService.getFormById(permitType.formId) : null
  return { ...permitType, form }
}

const listPermitTypes = async (appId) => {
  const permitTypes = await repository.listActive(appId)
  return Promise.all(permitTypes.map(hydratePermitType))
}

const getPermitTypeById = async (id, appId) => hydratePermitType(await repository.findActiveById(id, appId))
const getPermitTypeByKey = async (key, appId) => repository.findByKey(key, appId)
const getForAuthorization = (id, appId) => repository.findById(id, appId)

const getPermitTypeFormVersions = async (id, appId) => {
  const permitType = await hydratePermitType(await repository.findById(id, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) return []

  const form = await formService.getFormByIdWithVersions(permitType.form.id)
  return (form?.versions ?? []).map(({ id: formVersionId, version, status }) => ({
    id: formVersionId,
    version,
    status,
  }))
}

const getPermitTypeForm = async (id, appId, version) => {
  const permitType = await hydratePermitType(await repository.findActiveById(id, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) return null

  if (version == null) {
    try {
      const publishedForm = await formService.getPublishedForm(permitType.form.key)
      const publishedVersion = publishedForm.versions[0]
      return publishedVersion ? toFormResponse({ ...permitType, form: publishedForm }, publishedVersion) : null
    } catch (error) {
      if (error?.status === 404 || error?.code === 'NOT_FOUND') return null
      throw error
    }
  }

  try {
    const formVersion = await formService.getFormVersion({ formKey: permitType.form.key, version })
    return toFormResponse(permitType, formVersion)
  } catch (error) {
    if (error?.status === 404 || error?.code === 'NOT_FOUND') return null
    throw error
  }
}

const getPermitTypeFormVersion = async (id, appId, version) => {
  const permitType = await hydratePermitType(await repository.findById(id, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')
  const formVersion = await formService.getFormVersion({ formKey: permitType.form.key, version })
  return toFormResponse(permitType, formVersion)
}

const createPermitType = async ({ actorId, appId, data }) => {
  try {
    return await repository.withTransaction(async (tx) => {
      const existing = await repository.findByKey(data.key, appId, tx)
      if (existing) throw new ConflictError('A permit type with this key already exists.')
      const created = await repository.create({ ...data, appId }, tx)
      await recordAudit({ actorId, appId, action: 'OBO_PERMIT_TYPE_CREATED', entityType: 'OboPermitType', entityId: created.id, before: null, after: created, db: tx })
      return created
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A permit type with this key already exists.')
    throw error
  }
}

const updatePermitType = async ({ actorId, appId, id, data }) => {
  try {
    return await repository.withTransaction(async (tx) => {
      const before = await repository.findById(id, appId, tx)
      if (!before) throw new NotFoundError('Permit type not found.')
      if (data.key && data.key !== before.key) {
        const existing = await repository.findByKey(data.key, appId, tx)
        if (existing && existing.id !== id) throw new ConflictError('A permit type with this key already exists.')
      }
      const updated = await repository.update(id, appId, data, tx)
      if (!updated) throw new NotFoundError('Permit type not found.')
      await recordAudit({ actorId, appId, action: 'OBO_PERMIT_TYPE_UPDATED', entityType: 'OboPermitType', entityId: updated.id, before, after: updated, db: tx })
      return updated
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A permit type with this key already exists.')
    throw error
  }
}

const createPermitTypeForm = async ({ actorId, appId, permitTypeId, data }) => {
  const permitType = await repository.findById(permitTypeId, appId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot receive forms.')
  if (permitType.formId) throw new ConflictError('This permit type already has a form.')
  try {
    return await repository.withTransaction(async (tx) => {
      const existing = await repository.findById(permitTypeId, appId, tx)
      if (!existing) throw new NotFoundError('Permit type not found.')
      if (!existing.isActive) throw new ConflictError('Inactive permit types cannot receive forms.')
      if (existing.formId) throw new ConflictError('This permit type already has a form.')
      const form = await formService.createForm({ key: data.key, name: data.name, description: data.description ?? null, entityType: data.entityType ?? 'OboPermitApplication', sections: data.sections ?? [], fields: data.fields, actorId, db: tx })
      const updated = await repository.attachForm(permitTypeId, appId, form.id, tx)
      if (!updated) throw new NotFoundError('Permit type not found.')
      await recordAudit({ actorId, appId, action: 'OBO_PERMIT_TYPE_FORM_ATTACHED', entityType: 'OboPermitType', entityId: permitTypeId, before: existing, after: updated, db: tx })
      return form
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A form with this key already exists.')
    throw error
  }
}

const createPermitTypeFormVersion = async ({ actorId, appId, permitTypeId, data }) => {
  const permitType = await hydratePermitType(await repository.findById(permitTypeId, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot receive form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')
  const version = await formService.createFormVersion({ formKey: permitType.form.key, sections: data.sections ?? [], fields: data.fields, actorId })
  await recordAudit({ actorId, appId, action: 'OBO_FORM_VERSION_CREATED', entityType: 'FormVersion', entityId: version.id, before: null, after: version })
  return version
}

const updatePermitTypeFormVersion = async ({ actorId, appId, permitTypeId, version, data }) => {
  const permitType = await hydratePermitType(await repository.findById(permitTypeId, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot update form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')
  const updated = await formService.updateFormVersion({ formKey: permitType.form.key, version, sections: data.sections ?? [], fields: data.fields, actorId })
  await recordAudit({ actorId, appId, action: 'OBO_FORM_VERSION_UPDATED', entityType: 'FormVersion', entityId: updated.id, before: null, after: updated })
  return updated
}

const publishPermitTypeFormVersion = async ({ actorId, appId, permitTypeId, version }) => {
  const permitType = await hydratePermitType(await repository.findById(permitTypeId, appId))
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot publish form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')
  const published = await formService.publishFormVersion({ formKey: permitType.form.key, version, actorId })
  await recordAudit({ actorId, appId, action: 'OBO_FORM_VERSION_PUBLISHED', entityType: 'FormVersion', entityId: published.id, before: null, after: published })
  return published
}

export { listPermitTypes, getPermitTypeById, getPermitTypeByKey, getForAuthorization, getPermitTypeFormVersions, getPermitTypeForm, getPermitTypeFormVersion, createPermitType, updatePermitType, createPermitTypeForm, createPermitTypeFormVersion, updatePermitTypeFormVersion, publishPermitTypeFormVersion }
