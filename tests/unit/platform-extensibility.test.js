import { describe, expect, it } from 'vitest'
const { validateValue } = require('../../src/platform/custom-fields/custom-field.service')
const { signPayload } = require('../../src/platform/integrations/webhook.service')

describe('custom fields', () => {
  it('validates required and typed values', () => {
    const definition = { label: 'Estimated Cost', type: 'number', required: true }
    expect(validateValue(definition, undefined)).toBe('Estimated Cost is required.')
    expect(validateValue(definition, '100')).toBe('Estimated Cost must be a number.')
    expect(validateValue(definition, 100)).toBeNull()
  })

  it('validates configured select options', () => {
    const definition = { label: 'Occupancy', type: 'select', required: true, config: { options: ['RESIDENTIAL', { value: 'COMMERCIAL' }] } }
    expect(validateValue(definition, 'RESIDENTIAL')).toBeNull()
    expect(validateValue(definition, 'UNKNOWN')).toBe('Occupancy contains an invalid option.')
  })
})

describe('webhooks', () => {
  it('creates deterministic HMAC signatures for payloads', () => {
    const payload = { event: 'application.submitted', id: '123' }
    expect(signPayload({ payload, secret: 'secret' })).toBe(signPayload({ payload, secret: 'secret' }))
    expect(signPayload({ payload, secret: 'secret' })).not.toBe(signPayload({ payload, secret: 'other' }))
  })
})
