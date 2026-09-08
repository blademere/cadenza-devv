import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/modules/obo/permit-types/permit-type.repository.js')

const repository = await import('../../../../src/modules/obo/permit-types/permit-type.repository.js')
const service = await import('../../../../src/modules/obo/permit-types/permit-type.service.js')

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
})
