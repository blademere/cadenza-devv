import { Prisma } from '@prisma/client'
import { PAYMENT_STATUS } from './payment.constants.js'
import { PaymentAmountError } from './payment.errors.js'

const toDecimal = (value) => {
  try {
    return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value)
  } catch {
    throw new PaymentAmountError('Payment amount must be a valid monetary value.')
  }
}

const assertPositiveAmount = (amount) => {
  const value = toDecimal(amount)
  if (!value.isFinite() || value.lte(0)) {
    throw new PaymentAmountError('Payment amount must be greater than zero.')
  }
  return value
}

const assertWithinBalance = (amount, balance) => {
  const value = assertPositiveAmount(amount)
  const remaining = toDecimal(balance)
  if (!remaining.isFinite() || value.gt(remaining)) {
    throw new PaymentAmountError('Payment amount cannot exceed the remaining balance.')
  }
  return value
}

const isSuccessful = (status) => status === PAYMENT_STATUS.SUCCEEDED

export { toDecimal, assertPositiveAmount, assertWithinBalance, isSuccessful }
