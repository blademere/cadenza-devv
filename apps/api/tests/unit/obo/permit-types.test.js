import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/apps/obo/permit-types/permit-type.repository.js')
vi.mock('../../../src/platform/forms/form.service.js')
vi.mock('../../../src/platform/audit/audit.service.js')

const repository =
  await import('../../../src/apps/obo/permit-types/permit-type.repository.js')
const formService = await import('../../../src/platform/forms/form.service.js')
const auditService =
  await import('../../../src/platform/audit/audit.service.js')
const service =
  await import('../../../src/apps/obo/permit-types/permit-type.service.js')
const { createPermitTypeFormVersionValidator, oboProfessionalReferenceConfig } =
  await import('../../../src/apps/obo/permit-types/permit-type.form.validation.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  repository.findActiveById.mockResolvedValue({
    id: 'permit-1',
    name: 'Building Permit',
    isActive: true,
    formId: 'form-1',
  })
  formService.getFormById.mockResolvedValue({
    id: 'form-1',
    key: 'building-permit-form',
    name: 'Building Permit Application',
    description: 'Building permit form',
  })
  formService.getPublishedForm.mockResolvedValue({
    id: 'form-1',
    key: 'building-permit-form',
    name: 'Building Permit Application',
    description: 'Building permit form',
    versions: [
      {
        id: 'form-version-3',
        version: 3,
        status: 'PUBLISHED',
        sections: [],
        fields: [],
        documentRequirements: [],
      },
    ],
  })
  formService.getFormVersion.mockResolvedValue({
    id: 'form-version-2',
    version: 2,
    status: 'PUBLISHED',
    sections: [{ id: 'section-2' }],
    fields: [{ id: 'field-2' }],
    documentRequirements: [],
  })
  repository.withTransaction.mockImplementation(async (callback) =>
    callback({ name: 'transaction-client' })
  )
  auditService.recordAudit.mockResolvedValue(undefined)
})

describe('OBO permit type form service', () => {
  it('returns the latest published version when no version is requested', async () => {
    await expect(service.getPermitTypeForm('permit-1')).resolves.toMatchObject({
      id: 'form-1',
      version: 3,
      formVersionId: 'form-version-3',
      status: 'PUBLISHED',
    })
    expect(formService.getPublishedForm).toHaveBeenCalledWith(
      'building-permit-form'
    )
  })
  it('returns the requested published version when a version is provided', async () => {
    await expect(
      service.getPermitTypeForm('permit-1', 2)
    ).resolves.toMatchObject({
      id: 'form-1',
      version: 2,
      formVersionId: 'form-version-2',
      sections: [{ id: 'section-2' }],
    })
    expect(formService.getFormVersion).toHaveBeenCalledWith({
      formKey: 'building-permit-form',
      version: 2,
    })
  })
  it('returns a specific draft or published form version for management', async () => {
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      formId: 'form-1',
      isActive: true,
    })
    formService.getFormById.mockResolvedValue({
      id: 'form-1',
      key: 'building-permit-form',
      name: 'Building Permit Application',
      description: null,
    })
    formService.getFormVersion.mockResolvedValue({
      id: 'form-version-4',
      version: 4,
      status: 'DRAFT',
      sections: [],
      fields: [{ id: 'field-4' }],
      documentRequirements: [],
    })
    await expect(
      service.getPermitTypeFormVersion('permit-1', 4)
    ).resolves.toMatchObject({
      version: 4,
      status: 'DRAFT',
      formVersionId: 'form-version-4',
    })
    expect(formService.getFormVersion).toHaveBeenCalledWith({
      formKey: 'building-permit-form',
      version: 4,
    })
  })
  it('creates and atomically attaches a form to a permit type with version one as draft', async () => {
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
      versions: [{ version: 1, status: 'DRAFT' }],
    }
    const tx = { name: 'transaction-client' }
    repository.findById
      .mockResolvedValueOnce(permitType)
      .mockResolvedValueOnce(permitType)
    repository.attachForm.mockResolvedValue({ ...permitType, formId: form.id })
    formService.createForm.mockResolvedValue(form)
    await expect(
      service.createPermitTypeForm({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        data: {
          key: 'building-permit-form',
          name: 'Building Permit Application',
          description: 'Building permit form',
          sections: [{ key: 'applicant', title: 'Applicant Information' }],
          fields: [
            {
              key: 'name',
              label: 'Applicant Name',
              type: 'text',
              required: true,
              sectionKey: 'applicant',
            },
          ],
        },
      })
    ).resolves.toEqual(form)
    expect(repository.withTransaction).toHaveBeenCalled()
    expect(formService.createForm).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'building-permit-form',
        entityType: 'OboPermitApplication',
        db: tx,
      })
    )
    expect(repository.attachForm).toHaveBeenCalledWith('permit-1', 'form-1', tx)
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OBO_PERMIT_TYPE_FORM_ATTACHED',
        entityId: 'permit-1',
        db: tx,
      })
    )
  })
  it('rejects form creation when the permit type already has a form', async () => {
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: 'existing-form',
    })
    await expect(
      service.createPermitTypeForm({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        data: { key: 'new-form', name: 'New Form', fields: [] },
      })
    ).rejects.toThrow('already has a form')
    expect(formService.createForm).not.toHaveBeenCalled()
  })
  it('creates a new draft form version through the platform forms service', async () => {
    const version = {
      id: 'form-version-2',
      version: 2,
      status: 'DRAFT',
      sections: [],
      fields: [{ id: 'field-1' }],
    }
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: 'form-1',
    })
    formService.getFormById.mockResolvedValue({
      id: 'form-1',
      key: 'building-permit-form',
    })
    formService.createFormVersion.mockResolvedValue(version)
    await expect(
      service.createPermitTypeFormVersion({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        data: {
          sections: [{ key: 'applicant', title: 'Applicant Information' }],
          fields: [
            {
              key: 'name',
              label: 'Applicant Name',
              type: 'text',
              required: true,
              sectionKey: 'applicant',
            },
          ],
        },
      })
    ).resolves.toEqual(version)
    expect(formService.createFormVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        formKey: 'building-permit-form',
        actorId: 'user-1',
      })
    )
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OBO_FORM_VERSION_CREATED',
        entityId: 'form-version-2',
      })
    )
  })
  it('updates a draft form version through the platform forms service', async () => {
    const updated = {
      id: 'form-version-2',
      version: 2,
      status: 'DRAFT',
      sections: [{ id: 'section-1' }],
      fields: [{ id: 'field-1' }],
    }
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: 'form-1',
    })
    formService.getFormById.mockResolvedValue({
      id: 'form-1',
      key: 'building-permit-form',
    })
    formService.updateFormVersion.mockResolvedValue(updated)
    await expect(
      service.updatePermitTypeFormVersion({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        version: 2,
        data: {
          sections: [{ key: 'applicant', title: 'Applicant Information' }],
          fields: [{ key: 'name', label: 'Applicant Name', type: 'text' }],
        },
      })
    ).resolves.toEqual(updated)
    expect(formService.updateFormVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        formKey: 'building-permit-form',
        version: 2,
        actorId: 'user-1',
      })
    )
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OBO_FORM_VERSION_UPDATED',
        entityId: 'form-version-2',
      })
    )
  })
  it('rejects version creation when the permit type has no form', async () => {
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: null,
    })
    formService.getFormById.mockResolvedValue(null)
    await expect(
      service.createPermitTypeFormVersion({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        data: {
          sections: [],
          fields: [{ key: 'name', label: 'Name', type: 'text' }],
        },
      })
    ).rejects.toThrow('Permit type form not found')
    expect(formService.createFormVersion).not.toHaveBeenCalled()
  })
  it('publishes a draft form version through the platform forms service', async () => {
    const published = {
      id: 'form-version-2',
      version: 2,
      status: 'PUBLISHED',
      sections: [],
      fields: [],
    }
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: 'form-1',
    })
    formService.getFormById.mockResolvedValue({
      id: 'form-1',
      key: 'building-permit-form',
    })
    formService.publishFormVersion.mockResolvedValue(published)
    await expect(
      service.publishPermitTypeFormVersion({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        version: 2,
      })
    ).resolves.toEqual(published)
    expect(formService.publishFormVersion).toHaveBeenCalledWith({
      formKey: 'building-permit-form',
      version: 2,
      actorId: 'user-1',
    })
    expect(auditService.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OBO_FORM_VERSION_PUBLISHED',
        entityId: 'form-version-2',
      })
    )
  })
  it('rejects publishing when the permit type has no form', async () => {
    repository.findById.mockResolvedValue({
      id: 'permit-1',
      isActive: true,
      formId: null,
    })
    formService.getFormById.mockResolvedValue(null)
    await expect(
      service.publishPermitTypeFormVersion({
        actorId: 'user-1',
        permitTypeId: 'permit-1',
        version: 2,
      })
    ).rejects.toThrow('Permit type form not found')
    expect(formService.publishFormVersion).not.toHaveBeenCalled()
  })
})

describe('OBO professional reference field semantics', () => {
  const validRequest = (config = {}) => ({
    params: { permitTypeId: '00000000-0000-4000-8000-000000000001' },
    body: {
      fields: [
        {
          key: 'architect',
          label: 'Architect',
          type: 'reference',
          required: true,
          config: {
            referenceType: 'obo_professional',
            professionalRole: 'ARCHITECT',
            ...config,
          },
        },
      ],
      sections: [],
    },
  })
  it('accepts an OBO professional reference with a role', () => {
    expect(
      oboProfessionalReferenceConfig.parse({
        referenceType: 'obo_professional',
        professionalRole: 'ARCHITECT',
        multiple: false,
      })
    ).toEqual({
      referenceType: 'obo_professional',
      professionalRole: 'ARCHITECT',
      multiple: false,
    })
  })
  it('allows multiple professional references', () => {
    expect(
      oboProfessionalReferenceConfig.parse({
        referenceType: 'obo_professional',
        professionalRole: 'STRUCTURAL_ENGINEER',
        multiple: true,
      }).multiple
    ).toBe(true)
  })
  it('rejects non-OBO reference types', () => {
    expect(() =>
      oboProfessionalReferenceConfig.parse({
        referenceType: 'customer',
        professionalRole: 'ARCHITECT',
      })
    ).toThrow()
  })
  it('rejects missing professional role', () => {
    expect(() =>
      oboProfessionalReferenceConfig.parse({
        referenceType: 'obo_professional',
      })
    ).toThrow()
  })
  it('rejects non-canonical professional role identifiers', () => {
    expect(() =>
      oboProfessionalReferenceConfig.parse({
        referenceType: 'obo_professional',
        professionalRole: 'Architect',
      })
    ).toThrow()
  })
  it('rejects unknown configuration keys', () => {
    expect(() =>
      oboProfessionalReferenceConfig.parse({
        referenceType: 'obo_professional',
        professionalRole: 'ARCHITECT',
        source: 'manual',
      })
    ).toThrow()
  })
  it('accepts professional reference semantics through the permit form validator', async () => {
    await expect(
      createPermitTypeFormVersionValidator(validRequest())
    ).resolves.toEqual(validRequest())
  })
  it('rejects a reference field without professionalRole at the OBO boundary', async () => {
    const request = validRequest()
    delete request.body.fields[0].config.professionalRole
    await expect(
      createPermitTypeFormVersionValidator(request)
    ).rejects.toThrow()
  })
  it('rejects a reference field with an unsupported referenceType at the OBO boundary', async () => {
    await expect(
      createPermitTypeFormVersionValidator(
        validRequest({ referenceType: 'customer' })
      )
    ).rejects.toThrow()
  })
})
