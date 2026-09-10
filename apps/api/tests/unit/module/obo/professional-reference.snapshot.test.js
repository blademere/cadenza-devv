import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/modules/obo/professionals/professional.service.js')
vi.mock('../../../../src/platform/forms/form.service.js')

const professionalService = await import('../../../../src/modules/obo/professionals/professional.service.js')
const formService = await import('../../../../src/platform/forms/form.service.js')
const { buildProfessionalSnapshots } = await import('../../../../src/modules/obo/professionals/professional-reference.service.js')

const professional = {
  id: '00000000-0000-4000-8000-000000000001',
  registrationNumber: 'REG-123',
  prcId: 'PRC-123',
  ptrNumber: 'PTR-123',
  professionalRole: 'ARCHITECT',
  status: 'VERIFIED',
  person: {
    firstName: 'John',
    middleName: 'Q',
    lastName: 'Doe',
    suffix: null,
    isActive: true,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  formService.evaluateCondition.mockReturnValue(true)
  professionalService.getForReference.mockResolvedValue(professional)
})

afterEach(() => vi.clearAllMocks())

describe('professional submission snapshots', () => {
  it('captures the professional identity and credentials by form field', async () => {
    const formVersion = {
      fields: [{
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        required: true,
        visibility: null,
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: false },
      }],
    }

    await expect(buildProfessionalSnapshots({
      formVersion,
      formValues: { architect: professional.id },
    })).resolves.toEqual({
      architect: {
        professionalId: professional.id,
        name: 'John Q Doe',
        registrationNumber: 'REG-123',
        prcId: 'PRC-123',
        ptrNumber: 'PTR-123',
        role: 'ARCHITECT',
      },
    })
  })

  it('captures multiple selected professionals in field order', async () => {
    const second = {
      ...professional,
      id: '00000000-0000-4000-8000-000000000002',
      registrationNumber: 'REG-456',
      person: { ...professional.person, firstName: 'Jane', middleName: null, lastName: 'Smith' },
    }
    professionalService.getForReference
      .mockResolvedValueOnce(professional)
      .mockResolvedValueOnce(second)

    const formVersion = {
      fields: [{
        key: 'architects',
        label: 'Architects',
        type: 'reference',
        required: true,
        visibility: null,
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: true },
      }],
    }

    await expect(buildProfessionalSnapshots({
      formVersion,
      formValues: { architects: [professional.id, second.id] },
    })).resolves.toEqual({
      architects: [
        expect.objectContaining({ professionalId: professional.id, name: 'John Q Doe' }),
        expect.objectContaining({ professionalId: second.id, name: 'Jane Smith', registrationNumber: 'REG-456' }),
      ],
    })
  })

  it('does not snapshot hidden or empty professional fields', async () => {
    formService.evaluateCondition.mockReturnValue(false)

    const formVersion = {
      fields: [{
        key: 'architect',
        label: 'Architect',
        type: 'reference',
        required: false,
        visibility: { field: 'projectType', operator: 'equals', value: 'BUILDING' },
        config: { referenceType: 'obo_professional', professionalRole: 'ARCHITECT', multiple: false },
      }],
    }

    await expect(buildProfessionalSnapshots({
      formVersion,
      formValues: {},
    })).resolves.toEqual({})
    expect(professionalService.getForReference).not.toHaveBeenCalled()
  })
})
