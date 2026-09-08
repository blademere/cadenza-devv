import { describe, expect, it } from 'vitest'
import { oboProfessionalReferenceConfig } from '../../../src/modules/obo/permit-types/permit-type.form.validation.js'

describe('OBO professional reference field semantics', () => {
  it('accepts an OBO professional reference with a role', () => {
    expect(oboProfessionalReferenceConfig.parse({
      referenceType: 'obo_professional',
      professionalRole: 'ARCHITECT',
      multiple: false,
    })).toEqual({
      referenceType: 'obo_professional',
      professionalRole: 'ARCHITECT',
      multiple: false,
    })
  })

  it('allows multiple professional references', () => {
    expect(oboProfessionalReferenceConfig.parse({
      referenceType: 'obo_professional',
      professionalRole: 'STRUCTURAL_ENGINEER',
      multiple: true,
    }).multiple).toBe(true)
  })

  it('rejects non-OBO reference types', () => {
    expect(() => oboProfessionalReferenceConfig.parse({
      referenceType: 'customer',
      professionalRole: 'ARCHITECT',
    })).toThrow()
  })

  it('rejects missing professional role', () => {
    expect(() => oboProfessionalReferenceConfig.parse({
      referenceType: 'obo_professional',
    })).toThrow()
  })

  it('rejects non-canonical professional role identifiers', () => {
    expect(() => oboProfessionalReferenceConfig.parse({
      referenceType: 'obo_professional',
      professionalRole: 'Architect',
    })).toThrow()
  })

  it('rejects unknown configuration keys', () => {
    expect(() => oboProfessionalReferenceConfig.parse({
      referenceType: 'obo_professional',
      professionalRole: 'ARCHITECT',
      source: 'manual',
    })).toThrow()
  })
})
