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

  const publishedVersion = version == null
    ? permitType.form.versions[0]
    : await repository.findPublishedFormVersion(permitType.form.id, version)

  if (!publishedVersion) return null
  return toFormResponse(permitType, publishedVersion)
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
    if (error?.code === 'P2002') {
      throw new ConflictError('A permit type with this key already exists.')
    }
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
        if (existing && existing.id !== id) {
          throw new ConflictError('A permit type with this key already exists.')
        }
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
    if (error?.code === 'P2002') {
      throw new ConflictError('A permit type with this key already exists.')
    }
    throw error
  }
}

const createPermitTypeForm = async ({ actorId, permitTypeId, data }) => {
  const permitType = await repository.findById(permitTypeId)
  if (!permitType) throw new NotFoundError('Permit type not found.')
  if (!permitType.isActive) throw new ConflictError('Inactive permit types cannot receive forms.')
  if (permitType.formId) throw new ConflictError('This permit type already has a form.')

  const form = await formService.createForm({
    key: data.key,
    name: data.name,
    description: data.description ?? null,
    entityType: data.entityType ?? 'OboPermitApplication',
    sections: data.sections ?? [],
    fields: data.fields,
    actorId,
  })

  try {
    const updated = await repository.attachForm(permitTypeId, form.id)
    await recordAudit({
      actorId,
      action: 'OBO_PERMIT_TYPE_FORM_ATTACHED',
      entityType: 'OboPermitType',
      entityId: permitTypeId,
      before: permitType,
      after: updated,
    })
    return form
  } catch (error) {
    throw new ConflictError('The form was created but could not be attached to the permit type.')
  }
}

export {
  listPermitTypes,
  getPermitTypeForm,
  createPermitType,
  updatePermitType,
  createPermitTypeForm,
}
