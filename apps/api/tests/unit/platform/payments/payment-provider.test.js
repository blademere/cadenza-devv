import { describe, expect, it } from 'vitest'
import {
  createPaymentProvider,
  getPaymentProvider,
  listPaymentProviders,
  registerPaymentProvider,
} from '../../../../src/infrastructure/payments/index.js'

describe('payment provider registry', () => {
  it('registers and resolves provider adapters without provider-specific platform code', async () => {
    const name = `test-provider-${Date.now()}-${Math.random()}`
    const provider = createPaymentProvider({
      name,
      createPayment: async () => ({ reference: 'provider-ref' }),
    })

    registerPaymentProvider(provider)

    expect(getPaymentProvider(name)).toBe(provider)
    expect(listPaymentProviders()).toContain(name)
    await expect(provider.createPayment()).resolves.toEqual({ reference: 'provider-ref' })
  })

  it('fails clearly for unregistered providers', () => {
    expect(() => getPaymentProvider('missing-provider')).toThrow('not registered')
  })
})
