import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/obo/permit-types/permit-type.repository.js')
vi.mock('../../../src/platform/forms/form.service.js')
vi.mock('../../../src/platform/audit/audit.service.js')

const repository = await import('../../../src/apps/obo/permit-types/permit-type.repository.js')
const formService = await import('../../../src/platform/forms/form.service.js')
const auditService = await import('../../../src/platform/audit/audit.service.js')
const service = await import('../../../src/apps/obo/permit-types/permit-type.service.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  repository.findActiveById.mockResolvedValue({ id: 'permit-1', name: 'Building Permit', isActive: true, formId: 'form-1' })
  repository.findById.mockResolvedValue({ id: 'permit-1', name: 'Building Permit', isActive: true, formId: 'form-1' })
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit-form', name: 'Building Permit Application', description: 'Building permit form' })
  formService.getPublishedForm.mockResolvedValue({ id: 'form-1', key: 'building-permit-form', name: 'Building Permit Application', description: 'Building permit form', versions: [{ id: 'form-version-3', version: 3, status: 'PUBLISHED', sections: [], fields: [], documentRequirements: [] }] })
  formService.getFormVersion.mockResolvedValue({ id: 'form-version-2', version: 2, status: 'PUBLISHED', sections: [{ id: 'section-2' }], fields: [{ id: 'field-2' }], documentRequirements: [] })
  repository.withTransaction.mockImplementation(async (callback) => callback({ name: 'transaction-client' }))
  repository.attachForm.mockResolvedValue({ id: 'permit-1', formId: 'form-1' })
  formService.createForm.mockResolvedValue({ id: 'form-1', key: 'building-permit-form', name: 'Building Permit Application' })
  auditService.recordAudit.mockResolvedValue(undefined)
})

describe('OBO permit type form service', () => {
  it('returns the latest published version when no version is requested', async () => {
    await expect(service.getPermitTypeForm('permit-1', 'obo-app')).resolves.toMatchObject({ id: 'form-1', version: 3, formVersionId: 'form-version-3', status: 'PUBLISHED' })
    expect(formService.getPublishedForm).toHaveBeenCalledWith('building-permit-form', 'obo-app')
  })

  it('returns the requested published version when a version is provided', async () => {
    await expect(service.getPermitTypeForm('permit-1', 'obo-app', 2)).resolves.toMatchObject({ id: 'form-1', version: 2, formVersionId: 'form-version-2', sections: [{ id: 'section-2' }] })
    expect(formService.getFormVersion).toHaveBeenCalledWith({ appId: 'obo-app', formKey: 'building-permit-form', version: 2 })
  })

  it('returns a specific draft or published form version for management', async () => {
    formService.getFormVersion.mockResolvedValue({ id: 'form-version-4', version: 4, status: 'DRAFT', sections: [], fields: [{ id: 'field-4' }], documentRequirements: [] })
    await expect(service.getPermitTypeFormVersion('permit-1', 'obo-app', 4)).resolves.toMatchObject({ version: 4, status: 'DRAFT', formVersionId: 'form-version-4' })
    expect(formService.getFormVersion).toHaveBeenCalledWith({ appId: 'obo-app', formKey: 'building-permit-form', version: 4 })
  })

  it('creates and atomically attaches a form to a permit type with application context', async () => {
    const permitType = { id: 'permit-1', key: 'building-permit', name: 'Building Permit', isActive: true, formId: null }
    repository.findById.mockResolvedValue(permitType)
    await expect(service.createPermitTypeForm({ actorId: 'user-1', appId: 'obo-app', permitTypeId: 'permit-1', data: { key: 'building-permit-form', name: 'Building Permit Application', description: 'Building permit form', sections: [], fields: [] } })).resolves.toMatchObject({ id: 'form-1' })
    expect(formService.createForm).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', db: expect.anything() }))
    expect(repository.attachForm).toHaveBeenCalledWith('permit-1', 'obo-app', 'form-1', expect.anything())
    expect(auditService.recordAudit).toHaveBeenCalledWith(expect.objectContaining({ appId: 'obo-app', entityId: 'permit-1' }))
  })
})
