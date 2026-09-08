import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
vi.mock('../../../../../src/platform/forms/form.service.js')
vi.mock('../../../../../src/platform/audit/audit.service.js')

const repository = await import('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
const formService = await import('../../../../../src/platform/forms/form.service.js')
const auditService = await import('../../../../../src/platform/audit/audit.service.js')
const service = await import('../../../../../src/modules/obo/permit-types/permit-type.service.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  repository.findActiveById.mockResolvedValue({
    id: 'permit-1', name: 'Building Permit', form: {
      id: 'form-1', key: 'building-permit', name: 'Building Permit Application', description: 'Building permit form',
      versions: [{ id: 'form-version-3', version: 3, status: 'PUBLISHED', sections: [], fields: [], documentRequirements: [] }],
    },
  })
  repository.findPublishedFormVersion.mockResolvedValue({ id: 'form-version-2', version: 2, status: 'PUBLISHED', sections: [{ id: 'section-2' }], fields: [{ id: 'field-2' }], documentRequirements: [] })
  repository.withTransaction.mockImplementation(async (callback) => callback({ name: 'transaction-client' }))
  auditService.recordAudit.mockResolvedValue(undefined)
})

describe('OBO permit type form service', () => {
  it('returns the latest published version when no version is requested', async () => {
    await expect(service.getPermitTypeForm('permit-1')).resolves.toMatchObject({ id: 'form-1', version: 3, formVersionId: 'form-version-3', status: 'PUBLISHED' })
    expect(repository.findPublishedFormVersion).not.toHaveBeenCalled()
  })

  it('returns the requested published version when a version is provided', async () => {
    await expect(service.getPermitTypeForm('permit-1', 2)).resolves.toMatchObject({ id: 'form-1', version: 2, formVersionId: 'form-version-2', sections: [{ id: 'section-2' }] })
    expect(repository.findPublishedFormVersion).toHaveBeenCalledWith('form-1', 2)
  })

  it('returns a specific draft or published form version for management', async () => {
    repository.findByIdWithForm.mockResolvedValue({ id: 'permit-1', form: { id: 'form-1', key: 'building-permit-form', name: 'Building Permit Application', description: null } })
    formService.getFormVersion.mockResolvedValue({ id: 'form-version-4', version: 4, status: 'DRAFT', sections: [], fields: [{ id: 'field-4' }], documentRequirements: [] })

    await expect(service.getPermitTypeFormVersion('permit-1', 4)).resolves.toMatchObject({ version: 4, status: 'DRAFT', formVersionId: 'form-version-4' })
    expect(formService.getFormVersion).toHaveBeenCalledWith({ formKey: 'building-permit-form', version: 4 })
  })

  it('creates and atomically attaches a form to a permit type with version one as draft', async () => {
    const permitType = { id: 'permit-1', key: 'building-permit', name: 'Building Permit', isActive: true, formId: null }
    const form = { id: 'form-1', key: 'building-permit-form', name: 'Building Permit Application', versions: [{ version: 1, status: 'DRAFT' }] }
    const tx = { name: 'transaction-client' }
    repository.findById.mockResolvedValueOnce(permitType).mockResolvedValueOnce(permitType)
    repository.attachForm.mockResolvedValue({ ...permitType, formId: form.id })
    formService.createForm.mockResolvedValue(form)

    await expect(service.createPermitTypeForm({ actorId: 'user-1', permitTypeId: 'permit-1', data: { key: 'building-permit-form', name: 'Building Permit Application', description: 'Building permit form', sections: [{ key: 'applicant', title: 'Applicant Information' }], fields: [{ key: 'name', label: 'Applicant Name', type: 'text', required: true, sectionKey: 'applicant' }] } })).resolves.toEqual(form)
    expect(repository.withTransaction).toHaveBeenCalled()
    expect(formService.createForm).toHaveBeenCalledWith(expect.objectContaining({ key: 'building-permit-form', entityType: 'OboPermitApplication', db: tx }))
    expect(repository.attachForm).toHaveBeenCalledWith('permit-1', 'form-1', tx)
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'OBO_PERMIT_TYPE_FORM_ATTACHED', entityId: 'permit-1', db: tx }))
    expect(form.versions[0]).toMatchObject({ version: 1, status: 'DRAFT' })
  })

  it('rejects form creation when the permit type already has a form', async () => {
    repository.findById.mockResolvedValue({ id: 'permit-1', isActive: true, formId: 'existing-form' })
    await expect(service.createPermitTypeForm({ actorId: 'user-1', permitTypeId: 'permit-1', data: { key: 'new-form', name: 'New Form', fields: [] } })).rejects.toThrow('already has a form')
    expect(formService.createForm).not.toHaveBeenCalled()
  })

  it('creates a new draft form version through the platform forms service', async () => {
    const permitType = { id: 'permit-1', isActive: true, form: { id: 'form-1', key: 'building-permit-form' } }
    const version = { id: 'form-version-2', version: 2, status: 'DRAFT', sections: [], fields: [{ id: 'field-1' }] }
    repository.findByIdWithForm.mockResolvedValue(permitType)
    formService.createFormVersion.mockResolvedValue(version)

    await expect(service.createPermitTypeFormVersion({ actorId: 'user-1', permitTypeId: 'permit-1', data: { sections: [{ key: 'applicant', title: 'Applicant Information' }], fields: [{ key: 'name', label: 'Applicant Name', type: 'text', required: true, sectionKey: 'applicant' }] } })).resolves.toEqual(version)
    expect(formService.createFormVersion).toHaveBeenCalledWith(expect.objectContaining({ formKey: 'building-permit-form', actorId: 'user-1' }))
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'OBO_FORM_VERSION_CREATED', entityId: 'form-version-2' }))
  })

  it('updates a draft form version through the platform forms service', async () => {
    const permitType = { id: 'permit-1', isActive: true, form: { id: 'form-1', key: 'building-permit-form' } }
    const updated = { id: 'form-version-2', version: 2, status: 'DRAFT', sections: [{ id: 'section-1' }], fields: [{ id: 'field-1' }] }
    repository.findByIdWithForm.mockResolvedValue(permitType)
    formService.updateFormVersion.mockResolvedValue(updated)

    await expect(service.updatePermitTypeFormVersion({ actorId: 'user-1', permitTypeId: 'permit-1', version: 2, data: { sections: [{ key: 'applicant', title: 'Applicant Information' }], fields: [{ key: 'name', label: 'Applicant Name', type: 'text' }] } })).resolves.toEqual(updated)
    expect(formService.updateFormVersion).toHaveBeenCalledWith(expect.objectContaining({ formKey: 'building-permit-form', version: 2, actorId: 'user-1' }))
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'OBO_FORM_VERSION_UPDATED', entityId: 'form-version-2' }))
  })

  it('rejects version creation when the permit type has no form', async () => {
    repository.findByIdWithForm.mockResolvedValue({ id: 'permit-1', isActive: true, form: null })
    await expect(service.createPermitTypeFormVersion({ actorId: 'user-1', permitTypeId: 'permit-1', data: { sections: [], fields: [{ key: 'name', label: 'Name', type: 'text' }] } })).rejects.toThrow('Permit type form not found')
    expect(formService.createFormVersion).not.toHaveBeenCalled()
  })

  it('publishes a draft form version through the platform forms service', async () => {
    const permitType = { id: 'permit-1', isActive: true, form: { id: 'form-1', key: 'building-permit-form' } }
    const published = { id: 'form-version-2', version: 2, status: 'PUBLISHED', sections: [], fields: [] }
    repository.findByIdWithForm.mockResolvedValue(permitType)
    formService.publishFormVersion.mockResolvedValue(published)
    await expect(service.publishPermitTypeFormVersion({ actorId: 'user-1', permitTypeId: 'permit-1', version: 2 })).resolves.toEqual(published)
    expect(formService.publishFormVersion).toHaveBeenCalledWith({ formKey: 'building-permit-form', version: 2, actorId: 'user-1' })
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'OBO_FORM_VERSION_PUBLISHED', entityId: 'form-version-2' }))
  })

  it('rejects publishing when the permit type has no form', async () => {
    repository.findByIdWithForm.mockResolvedValue({ id: 'permit-1', isActive: true, form: null })
    await expect(service.publishPermitTypeFormVersion({ actorId: 'user-1', permitTypeId: 'permit-1', version: 2 })).rejects.toThrow('Permit type form not found')
    expect(formService.publishFormVersion).not.toHaveBeenCalled()
  })
})
