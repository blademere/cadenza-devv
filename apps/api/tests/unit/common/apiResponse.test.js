import { describe, expect, it } from 'vitest'
import { Prisma } from '@prisma/client'
import { serializeJsonValue } from '../../../src/common/responses/apiResponse.js'

describe('api response serialization', () => {
  it('serializes Prisma Decimal values to their decimal string representation', () => {
    const result = serializeJsonValue({
      price: new Prisma.Decimal('1250.50'),
      nested: { balanceDue: new Prisma.Decimal('375.25') },
      items: [new Prisma.Decimal('10.00')],
    })

    expect(result).toEqual({
      price: '1250.50',
      nested: { balanceDue: '375.25' },
      items: ['10.00'],
    })
  })

  it('preserves normal JSON values', () => {
    expect(serializeJsonValue({
      amount: '1250.50',
      count: 2,
      active: true,
      value: null,
    })).toEqual({
      amount: '1250.50',
      count: 2,
      active: true,
      value: null,
    })
  })
})
