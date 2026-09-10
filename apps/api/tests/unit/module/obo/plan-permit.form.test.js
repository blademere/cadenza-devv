import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/platform/forms/form.service.js')

const formService = await import('../../../../src/platform/forms/form.service.js')
const { resolveAndValidateForm } = await import('../../../../src/modules/obo/plan-permits/plan-permit.form.js')

afterEach(() => vi.clearAllMocks())
beforeEach(() => {
  formService.getFormById.mockResolvedValue({ id: 'form-1', key: 'building-permit', isActive: true })
  formService.getFormVersionById.mockResolvedValue({
    id: 'form-version-2',
    formId: 'form-1',
    version: 2,
    status: 'PUBLISHED',
  })
  formService.validateFormValues.mockResolvedValue({ valid: true })
})

describe('OBO plan permit form resolution', () => {
  it('resolves an explicitly selected published version instead of the latest version', async () => {
    await expect(resolveAndValidateForm({
      permitType: { id: 'permit-1', formId: 'form-1' },
      formVersionId: 'form-version-2',
      formValues: { floorArea: 120 },
    })).resolves.toEqual({ formVersionId: 'form-version-2' })

    expect(formService.getFormById).toHaveBeenCalledWith('form-1')
    expect(formService.getFormVersionById).toHaveBeenCalledWith('form-version-2')
    expect(formService.validateFormValues).toHaveBeenCalledWith({
      formKey: 'building-permit',
      version: 2,
      values: { floorArea: 120 },
      requireRequired: false,
    })
  })

  it('returns field validation errors to the API error response', async () => {
    const errors = [
      { field: 'floorArea', code: 'VALIDATION', message: 'Floor Area must be greater than 0.' },
      { field: 'projectAddress', code: 'REQUIRED', message: 'Project Address is required.' },
    ]
    formService.validateFormValues.mockResolvedValue({ valid: false, errors })

    await expect(resolveAndValidateForm({
      permitType: { id: 'permit-1', formId: 'form-1' },
      formVersionId: 'form-version-2',
      formValues: {},
    })).rejects.toMatchObject({ statusCode: 422, errors, message: 'Permit form validation failed.' })
  })

  it('rejects a stored version that does not belong to the permit type form', async () => {
    formService.getFormVersionById.mockResolvedValue({
      id: 'form-version-2',
      formId: 'different-form',
      version: 2,
      status: 'PUBLISHED',
    })

    await expect(resolveAndValidateForm({
      permitType: { id: 'permit-1', formId: 'form-1' },
      formVersionId: 'form-version-2',
      formValues: {},
    })).rejects.toThrow('selected form version is not a published version for this permit type')
    expect(formService.validateFormValues).not.toHaveBeenCalled()
  })

  it('rejects a stored version that is not published', async () => {
    formService.getFormVersionById.mockResolvedValue({
      id: 'form-version-2',
      formId: 'form-1',
      version: 2,
      status: 'DRAFT',
    })

    await expect(resolveAndValidateForm({
      permitType: { id: 'permit-1', formId: 'form-1' },
      formVersionId: 'form-version-2',
      formValues: {},
    })).rejects.toThrow('selected form version is not a published version for this permit type')
    expect(formService.validateFormValues).not.toHaveBeenCalled()
  })
})
