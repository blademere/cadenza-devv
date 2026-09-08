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

const listPermitTypes = () => repository.listActive()

const getPermitTypeForm = async (id, version) => {
  const permitType = await repository.findActiveById(id)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) return null

  const formVersion = version == null
    ? await repository.findLatestDraftFormVersion(permitType.form.id) ?? permitType.form.versions[0]
    : await repository.findPublishedFormVersion(permitType.form.id, version)

  if (!formVersion) return null
  return toFormResponse(permitType, formVersion)
}

const getPermitTypeFormVersion = async (id, version) => {
  const permitType = await repository.findByIdWithForm(id)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')
  const formVersion = await formService.getFormVersion({ formKey: permitType.form.key, version })
  return toFormResponse(permitType, formVersion)
}

const createPermitType = async ({ actorId, data }) => {
  try {
    return await repository.withTransaction(async (tx) => {
      const existing = await repository.findByKey(data.key, tx)
      if (existing) throw new ConflictError('A permit type with this key already exists.')

      const created = await repository.create(data, tx)
      await recordAudit({
        actorId,
        action: 'OBO_PERMIT_TYPE_CREATED',
        entityType: 'OboPermitType',
        entityId: created.id,
        before: null,
        after: created,
        db: tx,
      })
      return created
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A permit type with this key already exists.')
    throw error
  }
}

const updatePermitType = async ({ actorId, id, data }) => {
  try {
    return await repository.withTransaction(async (tx) => {
      const before = await repository.findById(id, tx)
      if (!before) throw new NotFoundError('Permit type not found.')

      if (data.key && data.key !== before.key) {
        const existing = await repository.findByKey(data.key, tx)
        if (existing && existing.id !== id) throw new ConflictError('A permit type with this key already exists.')
      }

      const updated = await repository.update(id, data, tx)
      await recordAudit({
        actorId,
        action: 'OBO_PERMIT_TYPE_UPDATED',
        entityType: 'OboPermitType',
        entityId: updated.id,
        before,
        after: updated,
        db: tx,
      })
      return updated
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A permit type with this key already exists.')
    throw error
  }
}

const createPermitTypeForm = async ({ actorId, permitTypeId, data }) => {
  const permitType = await repository.findById(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot receive forms.')
  if (permitType.formId) throw new ConflictError('This permit type already has a form.')

  try {
    return await repository.withTransaction(async (tx) => {
      const existing = await repository.findById(permitTypeId, tx)
      if (!existing) throw new NotFoundError('Permit type not found.')
      if (!existing.isActive) throw new ConflictError('Inactive permit types cannot receive forms.')
      if (existing.formId) throw new ConflictError('This permit type already has a form.')

      const form = await formService.createForm({
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        entityType: data.entityType ?? 'OboPermitApplication',
        sections: data.sections ?? [],
        fields: data.fields,
        actorId,
        db: tx,
      })

      const updated = await repository.attachForm(permitTypeId, form.id, tx)
      await recordAudit({
        actorId,
        action: 'OBO_PERMIT_TYPE_FORM_ATTACHED',
        entityType: 'OboPermitType',
        entityId: permitTypeId,
        before: existing,
        after: updated,
        db: tx,
      })

      return form
    })
  } catch (error) {
    if (error?.code === 'P2002') throw new ConflictError('A form with this key already exists.')
    throw error
  }
}

const createPermitTypeFormVersion = async ({ actorId, permitTypeId, data }) => {
  const permitType = await repository.findByIdWithForm(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot receive form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')

  const version = await formService.createFormVersion({
    formKey: permitType.form.key,
    sections: data.sections ?? [],
    fields: data.fields,
    actorId,
  })

  await recordAudit({
    actorId,
    action: 'OBO_FORM_VERSION_CREATED',
    entityType: 'FormVersion',
    entityId: version.id,
    before: null,
    after: version,
  })

  return version
}

const updatePermitTypeFormVersion = async ({ actorId, permitTypeId, version, data }) => {
  const permitType = await repository.findByIdWithForm(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot update form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')

  const updated = await formService.updateFormVersion({
    formKey: permitType.form.key,
    version,
    sections: data.sections ?? [],
    fields: data.fields,
    actorId,
  })

  await recordAudit({
    actorId,
    action: 'OBO_FORM_VERSION_UPDATED',
    entityType: 'FormVersion',
    entityId: updated.id,
    before: null,
    after: updated,
  })

  return updated
}

const publishPermitTypeFormVersion = async ({ actorId, permitTypeId, version }) => {
  const permitType = await repository.findByIdWithForm(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot publish form versions.')
  if (!permitType.form) throw new NotFoundError('Permit type form not found.')

  const published = await formService.publishFormVersion({
    formKey: permitType.form.key,
    version,
    actorId,
  })

  await recordAudit({
    actorId,
    action: 'OBO_FORM_VERSION_PUBLISHED',
    entityType: 'FormVersion',
    entityId: published.id,
    before: null,
    after: published,
  })

  return published
}

export {
  listPermitTypes,
  getPermitTypeForm,
  getPermitTypeFormVersion,
  createPermitType,
  updatePermitType,
  createPermitTypeForm,
  createPermitTypeFormVersion,
  updatePermitTypeFormVersion,
  publishPermitTypeFormVersion,
}
