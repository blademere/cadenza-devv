import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
vi.mock('../../../../../src/platform/forms/form.service.js')

const repository = await import('../../../../../src/modules/obo/permit-types/permit-type.repository.js')
const formService = await import('../../../../../src/platform/forms/form.service.js')
const service = await import('../../../../../src/modules/obo/permit-types/permit-type.service.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  repository.findActiveById.mockResolvedValue({
    id: 'permit-1',
    name: 'Building Permit',
    form: {
      id: 'form-1',
      key: 'building-permit',
      name: 'Building Permit Application',
      description: 'Building permit form',
      versions: [{
        id: 'form-version-3',
        version: 3,
        sections: [],
        fields: [],
        documentRequirements: [],
      }],
    },
  })
  repository.findPublishedFormVersion.mockResolvedValue({
    id: 'form-version-2',
    version: 2,
    sections: [{ id: 'section-2' }],
    fields: [{ id: 'field-2' }],
    documentRequirements: [],
  })
})

describe('OBO permit type form service', () => {
  it('returns the latest published version when no version is requested', async () => {
    await expect(service.getPermitTypeForm('permit-1')).resolves.toMatchObject({
      id: 'form-1',
      version: 3,
      formVersionId: 'form-version-3',
    })
    expect(repository.findPublishedFormVersion).not.toHaveBeenCalled()
  })

  it('returns the requested published version when a version is provided', async () => {
    await expect(service.getPermitTypeForm('permit-1', 2)).resolves.toMatchObject({
      id: 'form-1',
      version: 2,
      formVersionId: 'form-version-2',
      sections: [{ id: 'section-2' }],
    })
    expect(repository.findPublishedFormVersion).toHaveBeenCalledWith('form-1', 2)
  })

  it('creates and attaches a form to a permit type', async () => {
    const permitType = {
      id: 'permit-1',
      key: 'building-permit',
      name: 'Building Permit',
      isActive: true,
      formId: null,
    }
    const form = {
      id: 'form-1',
      key: 'building-permit-form',
      name: 'Building Permit Application',
      versions: [{ version: 1, status: 'PUBLISHED' }],
    }

    repository.findById.mockResolvedValue(permitType)
    repository.attachForm.mockResolvedValue({ ...permitType, formId: form.id })
    formService.createForm.mockResolvedValue(form)

    await expect(service.createPermitTypeForm({
      actorId: 'user-1',
      permitTypeId: 'permit-1',
      data: {
        key: 'building-permit-form',
        name: 'Building Permit Application',
        description: 'Building permit form',
        sections: [{ key: 'applicant', title: 'Applicant Information' }],
        fields: [{ key: 'name', label: 'Applicant Name', type: 'text', required: true, sectionKey: 'applicant' }],
      },
    })).resolves.toEqual(form)

    expect(formService.createForm).toHaveBeenCalledWith(expect.objectContaining({
      key: 'building-permit-form',
      entityType: 'OboPermitApplication',
    }))
    expect(repository.attachForm).toHaveBeenCalledWith('permit-1', 'form-1')
  })

  it('rejects form creation when the permit type already has a form', async () => {
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: 'existing-form',
    })

    await expect(service.createPermitTypeForm({
      actorId: 'user-1',
      permitTypeId: 'permit-1',
      data: { key: 'new-form', name: 'New Form', fields: [] },
    })).rejects.toThrow('already has a form')

    expect(formService.createForm).not.toHaveBeenCalled()
  })
})
