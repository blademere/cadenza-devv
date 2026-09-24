import { describe, expect, it } from 'vitest'
import { assertPositiveAmount, assertWithinBalance, toDecimal } from '../../../../src/platform/payments/payment.policy.js'

describe('payment policy', () => {
  it('accepts positive decimal monetary values without floating point conversion', () => {
    expect(assertPositiveAmount('10.125').toString()).toBe('10.125')
  })

  it('rejects zero and negative payments', () => {
    expect(() => assertPositiveAmount('0')).toThrow('greater than zero')
    expect(() => assertPositiveAmount('-1')).toThrow('greater than zero')
  })

  it('rejects payments above the remaining balance', () => {
    expect(() => assertWithinBalance('100.01', '100')).toThrow('remaining balance')
  })

  it('accepts a partial payment and an exact full payment', () => {
    expect(assertWithinBalance('25', '100').toString()).toBe('25')
    expect(assertWithinBalance('100', '100').toString()).toBe('100')
  })

  it('rejects malformed monetary values', () => {
    expect(() => toDecimal('not-a-number')).toThrow('valid monetary value')
  })
})
