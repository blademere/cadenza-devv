import { describe, expect, it } from 'vitest'
import { extractFieldErrors } from '../../../../src/features/plan-permits/pages/ApplicationFormPage.jsx'

describe('Plan Permit form validation errors', () => {
  it('maps API field errors to form field keys', () => {
    expect(extractFieldErrors({
      errors: [
        { field: 'projectAddress', code: 'REQUIRED', message: 'Project Address is required.' },
        { field: 'floorArea', code: 'VALIDATION', message: 'Floor Area must be greater than 0.' },
      ],
    })).toEqual({
      projectAddress: 'Project Address is required.',
      floorArea: 'Floor Area must be greater than 0.',
    })
  })

  it('supports path-based validation errors and preserves the first message per field', () => {
    expect(extractFieldErrors({
      errors: [
        { path: 'projectAddress', message: 'Project Address is required.' },
        { path: 'projectAddress', message: 'Project Address is invalid.' },
      ],
    })).toEqual({
      projectAddress: 'Project Address is required.',
    })
  })

  it('supports object-shaped field errors', () => {
    expect(extractFieldErrors({
      errors: {
        projectAddress: { message: 'Project Address is required.' },
        floorArea: ['Floor Area is required.', 'Floor Area must be greater than 0.'],
      },
    })).toEqual({
      projectAddress: 'Project Address is required.',
      floorArea: 'Floor Area is required., Floor Area must be greater than 0.',
    })
  })

  it('returns no field errors for an unrelated API error', () => {
    expect(extractFieldErrors({
      errors: [{ code: 'WORKFLOW', message: 'Only draft applications can be updated.' }],
    })).toEqual({})
  })
})
