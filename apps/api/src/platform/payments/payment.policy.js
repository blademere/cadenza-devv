import { PAYMENT_STATUS } from './payment.constants.js'
import { PaymentAmountError } from './payment.errors.js'

const toNumber = (value) => Number(value)

const assertPositiveAmount = (amount) => {
  if (!Number.isFinite(toNumber(amount)) || toNumber(amount) <= 0) {
    throw new PaymentAmountError('Payment amount must be greater than zero.')
  }
}

const assertWithinBalance = (amount, balance) => {
  assertPositiveAmount(amount)
  if (toNumber(amount) > toNumber(balance)) {
    throw new PaymentAmountError('Payment amount cannot exceed the remaining balance.')
  }
}

const isSuccessful = (status) => status === PAYMENT_STATUS.SUCCEEDED

export { assertPositiveAmount, assertWithinBalance, isSuccessful }
