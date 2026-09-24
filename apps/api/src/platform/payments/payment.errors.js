class PaymentError extends Error {
  constructor(message, code = 'PAYMENT_ERROR') {
    super(message)
    this.name = 'PaymentError'
    this.code = code
  }
}

class PaymentAmountError extends PaymentError {
  constructor(message) {
    super(message, 'PAYMENT_AMOUNT_INVALID')
  }
}

class PaymentStateError extends PaymentError {
  constructor(message) {
    super(message, 'PAYMENT_STATE_INVALID')
  }
}

export { PaymentError, PaymentAmountError, PaymentStateError }
