import { describe, expect, it } from 'vitest'
import {
  createApplicationValidator,
  updateApplicationValidator,
} from '../../../../src/modules/obo/plan-permits/plan-permit.validation.js'

const uuid = '00000000-0000-4000-8000-000000000001'

const request = (body, params = {}) => ({ body, params })

describe('OBO plan permit application contract', () => {
  it('accepts form-based professional references without a top-level professionalId', async () => {
    const result = await createApplicationValidator(request({
      permitTypeId: uuid,
      formVersionId: uuid,
      formValues: {
        architect: uuid,
        civilEngineer: [uuid],
      },
    }))

    expect(result.body).toEqual({
      permitTypeId: uuid,
      formVersionId: uuid,
      formValues: {
        architect: uuid,
        civilEngineer: [uuid],
      },
    })
    expect(result.body).not.toHaveProperty('professionalId')
  })

  it('rejects the legacy professionalId on application creation', async () => {
    await expect(createApplicationValidator(request({
      permitTypeId: uuid,
      professionalId: uuid,
      formValues: {},
    }))).rejects.toThrow()
  })

  it('requires permitTypeId and formValues when creating an application', async () => {
    await expect(createApplicationValidator(request({
      formValues: {},
    }))).rejects.toThrow()

    await expect(createApplicationValidator(request({
      permitTypeId: uuid,
    }))).rejects.toThrow()
  })

  it('accepts draft updates using formValues and an optional form version', async () => {
    const result = await updateApplicationValidator(request({
      formVersionId: uuid,
      formValues: {
        architect: uuid,
      },
    }, { id: uuid }))

    expect(result.body).toEqual({
      formVersionId: uuid,
      formValues: {
        architect: uuid,
      },
    })
    expect(result.body).not.toHaveProperty('professionalId')
  })

  it('rejects the legacy professionalId on draft updates', async () => {
    await expect(updateApplicationValidator(request({
      professionalId: uuid,
      formValues: {},
    }, { id: uuid }))).rejects.toThrow()
  })
})
