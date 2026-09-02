import { describe, expect, it } from 'vitest'

const { registrationValidator } = require('../../../../../src/modules/obo/clients/client.validation.js')

describe('OBO client registration validation', () => {
  it('accepts a valid client profile', async () => {
    const result = await registrationValidator({
      body: {
        firstName: 'Juan',
        middleName: 'Dela',
        lastName: 'Cruz',
        suffix: null,
        email: 'CLIENT@example.com',
        phone: '09171234567',
        address: { barangay: 'Poblacion', city: 'Dipolog' },
      },
    })

    expect(result.body).toMatchObject({
      firstName: 'Juan',
      lastName: 'Cruz',
      email: 'client@example.com',
    })
  })

  it('rejects missing required names', async () => {
    await expect(registrationValidator({ body: { firstName: 'Juan' } })).rejects.toThrow()
  })

  it('rejects client-controlled ownership fields', async () => {
    await expect(registrationValidator({
      body: { firstName: 'Juan', lastName: 'Cruz', userId: 42 },
    })).rejects.toThrow()
  })
})
