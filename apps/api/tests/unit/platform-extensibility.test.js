import { describe, expect, it } from 'vitest'
const { validateFieldValue } = require('../../src/platform/forms/form.service')
const { signPayload } = require('../../src/platform/integrations/webhook.service')

describe('dynamic form fields', () => {
  it('validates required and typed values', () => {
    const field = { key: 'estimatedCost', label: 'Estimated Cost', type: 'number', required: true, options: [] }
    expect(validateFieldValue(field, undefined, {})).toEqual([
      { field: 'estimatedCost', code: 'REQUIRED', message: 'Estimated Cost is required.' },
    ])
    expect(validateFieldValue(field, '100', {})).toEqual([
      { field: 'estimatedCost', code: 'TYPE', message: 'Estimated Cost must be a number.' },
    ])
    expect(validateFieldValue(field, 100, {})).toEqual([])
  })

  it('validates configured select options', () => {
    const field = {
      key: 'occupancy',
      label: 'Occupancy',
      type: 'select',
      required: true,
      options: [
        { value: 'RESIDENTIAL', label: 'Residential' },
        { value: 'COMMERCIAL', label: 'Commercial' },
      ],
    }
    expect(validateFieldValue(field, 'RESIDENTIAL', {})).toEqual([])
    expect(validateFieldValue(field, 'UNKNOWN', {})).toEqual([
      { field: 'occupancy', code: 'OPTION', message: 'Occupancy contains an invalid option.' },
    ])
  })
})

describe('webhooks', () => {
  it('creates deterministic HMAC signatures for payloads', () => {
    const payload = { event: 'application.submitted', id: '123' }
    expect(signPayload({ payload, secret: 'secret' })).toBe(signPayload({ payload, secret: 'secret' }))
    expect(signPayload({ payload, secret: 'secret' })).not.toBe(signPayload({ payload, secret: 'other' }))
  })
})
