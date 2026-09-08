import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  repository: { findById: vi.fn() },
  evaluateCondition: vi.fn(() => true),
}))

vi.mock('../../../../src/modules/obo/professionals/professional.repository.js', () => mocks.repository)
vi.mock('../../../../src/platform/forms/form.service.js', () => ({ evaluateCondition: mocks.evaluateCondition }))

const service = await import('../../../../src/modules/obo/plan-permits/professional-reference.service.js')

afterEach(() => vi.clearAllMocks())

const formVersion = (field) => ({
  id: 'form-version-1',
  fields: [field],
})

const professional = (overrides = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  status: 'VERIFIED',
  professionalRole: 'ARCHITECT',
  person: { id: 'person-1', isActive: true },
  ...overrides,
})

describe('OBO professional reference validation', () => {
  it('accepts a verified active professional with the configured role', async () => {
    mocks.repository.findById.mockResolvedValue(professional())

    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        required: true,
        visibility: null,
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: false },
      }),
      formValues: { architect: professional().id },
    })).resolves.toBe(true)

    expect(mocks.repository.findById).toHaveBeenCalledWith(professional().id)
  })

  it('rejects an invalid professional identifier', async () => {
    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT' },
      }),
      formValues: { architect: 'not-a-uuid' },
    })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: 'REFERENCE' })] })

    expect(mocks.repository.findById).not.toHaveBeenCalled()
  })

  it('rejects nonexistent, unverified, inactive, and wrong-role professionals', async () => {
    const id = professional().id
    mocks.repository.findById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(professional({ status: 'PENDING_VERIFICATION' }))
      .mockResolvedValueOnce(professional({ person: { id: 'person-1', isActive: false } }))
      .mockResolvedValueOnce(professional({ professionalRole: 'CIVIL_ENGINEER' }))

    const field = {
      key: 'architect',
      label: 'Architect',
      type: 'reference',
      config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT' },
    }

    for (const expectedCode of ['NOT_FOUND', 'NOT_VERIFIED', 'INACTIVE', 'ROLE']) {
      await expect(service.validateProfessionalReferences({
        formVersion: formVersion(field),
        formValues: { architect: id },
      })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: expectedCode })] })
    }
  })

  it('validates every selected professional when multiple is enabled', async () => {
    const first = professional({ id: '00000000-0000-4000-8000-000000000001' })
    const second = professional({ id: '00000000-0000-4000-8000-000000000002' })
    mocks.repository.findById.mockImplementation(async (id) => id === first.id ? first : second)

    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architects',
        label: 'Architects',
        type: 'reference',
        required: true,
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: true },
      }),
      formValues: { architects: [first.id, second.id] },
    })).resolves.toBe(true)

    expect(mocks.repository.findById).toHaveBeenCalledTimes(2)
  })

  it('rejects a scalar value when multiple selection is enabled', async () => {
    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architects',
        label: 'Architects',
        type: 'reference',
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: true },
      }),
      formValues: { architects: professional().id },
    })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: 'TYPE' })] })

    expect(mocks.repository.findById).not.toHaveBeenCalled()
  })

  it('rejects an array when single selection is configured', async () => {
    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: false },
      }),
      formValues: { architect: [professional().id] },
    })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: 'TYPE' })] })

    expect(mocks.repository.findById).not.toHaveBeenCalled()
  })

  it('rejects duplicate professional references in a multiple field', async () => {
    const id = professional().id
    mocks.repository.findById.mockResolvedValue(professional())

    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architects',
        label: 'Architects',
        type: 'reference',
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: true },
      }),
      formValues: { architects: [id, id] },
    })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: 'DUPLICATE' })] })

    expect(mocks.repository.findById).toHaveBeenCalledTimes(1)
  })

  it('does not query a professional for invalid reference values', async () => {
    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architects',
        label: 'Architects',
        type: 'reference',
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: true },
      }),
      formValues: { architects: ['invalid-id', 'also-invalid'] },
    })).rejects.toMatchObject({
      statusCode: 422,
      errors: [
        expect.objectContaining({ code: 'REFERENCE', reference: 'invalid-id' }),
        expect.objectContaining({ code: 'REFERENCE', reference: 'also-invalid' }),
      ],
    })

    expect(mocks.repository.findById).not.toHaveBeenCalled()
  })

  it('rejects a missing required professional reference', async () => {
    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        required: true,
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT' },
      }),
      formValues: {},
    })).rejects.toMatchObject({ statusCode: 422, errors: [expect.objectContaining({ code: 'REQUIRED' })] })
  })

  it('does not validate hidden professional fields', async () => {
    mocks.evaluateCondition.mockReturnValue(false)

    await expect(service.validateProfessionalReferences({
      formVersion: formVersion({
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        required: true,
        visibility: { field: 'permitKind', operator: 'equals', value: 'none' },
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT' },
      }),
      formValues: {},
    })).resolves.toBe(true)

    expect(mocks.repository.findById).not.toHaveBeenCalled()
  })
})
