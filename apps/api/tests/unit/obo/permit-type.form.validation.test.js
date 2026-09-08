import { describe, expect, it } from 'vitest'
import {
  createPermitTypeFormVersionValidator,
  oboProfessionalReferenceConfig,
} from '../../../src/modules/obo/permit-types/permit-type.form.validation.js'

const validRequest = (config = {}) => ({
  params: { permitTypeId: '00000000-0000-0000-0000-000000000001' },
  body: {
    fields: [{
      key: 'architect',
      label: 'Architect',
      type: 'reference',
      required: true,
      config: {
        referenceType: 'obo_professional',
        professionalRole: 'ARCHITECT',
        ...config,
      },
    }],
    sections: [],
  },
})

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

  it('accepts professional reference semantics through the permit form validator', async () => {
    await expect(createPermitTypeFormVersionValidator(validRequest())).resolves.toEqual(validRequest())
  })

  it('rejects a reference field without professionalRole at the OBO boundary', async () => {
    const request = validRequest()
    delete request.body.fields[0].config.professionalRole

    await expect(createPermitTypeFormVersionValidator(request)).rejects.toThrow()
  })

  it('rejects a reference field with an unsupported referenceType at the OBO boundary', async () => {
    const request = validRequest({ referenceType: 'customer' })

    await expect(createPermitTypeFormVersionValidator(request)).rejects.toThrow()
  })
})
