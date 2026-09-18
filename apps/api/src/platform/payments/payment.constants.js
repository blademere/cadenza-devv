const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
})

const OBLIGATION_STATUS = Object.freeze({
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
})

const PAYMENT_METHOD = Object.freeze({
  CASH: 'CASH',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CARD: 'CARD',
  E_WALLET: 'E_WALLET',
  OTHER: 'OTHER',
})

const PAYMENT_EVENTS = Object.freeze({
  CREATED: 'payment.created',
  PROCESSING: 'payment.processing',
  SUCCEEDED: 'payment.succeeded',
  FAILED: 'payment.failed',
  CANCELLED: 'payment.cancelled',
  REFUNDED: 'payment.refunded',
  OBLIGATION_PARTIALLY_PAID: 'payment.obligation.partially_paid',
  OBLIGATION_PAID: 'payment.obligation.paid',
})

export { PAYMENT_STATUS, OBLIGATION_STATUS, PAYMENT_METHOD, PAYMENT_EVENTS }
