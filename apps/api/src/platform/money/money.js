import { Prisma } from '@prisma/client'

const toDecimal = (value, field = 'amount') => {
  try {
    const amount = new Prisma.Decimal(value)
    if (!amount.isFinite()) throw new Error()
    return amount
  } catch {
    throw new TypeError(`${field} must be a valid decimal amount.`)
  }
}

const positiveDecimal = (value, field = 'amount') => {
  const amount = toDecimal(value, field)
  if (amount.lte(0)) throw new TypeError(`${field} must be greater than zero.`)
  return amount
}

const compare = (left, right) => toDecimal(left).cmp(toDecimal(right))

export { toDecimal, positiveDecimal, compare }
