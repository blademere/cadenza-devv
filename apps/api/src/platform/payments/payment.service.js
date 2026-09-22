import { enqueueEvent } from '../event-bus/event-outbox.service.js'
import { recordAudit } from '../audit/audit.service.js'
import {
  createObligation,
  findObligationById,
  createPayment,
  findPaymentByIdempotencyKey,
  findPaymentById,
  listSuccessfulPayments,
  listPayments,
  createRefund,
  withTransaction,
  lockObligation,
  lockPayment,
  updateObligationStatus,
} from './payment.repository.js'
import { OBLIGATION_STATUS, PAYMENT_EVENTS, PAYMENT_STATUS } from './payment.constants.js'
import { assertWithinBalance } from './payment.policy.js'
import { PaymentStateError } from './payment.errors.js'
import { toDecimal, positiveDecimal, compare } from '../money/money.js'
import { getPaymentProvider } from './payment-provider.registry.js'

const decimal = toDecimal

const summarizeObligation = (obligation, successfulPayments) => {
  const paidAmount = successfulPayments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    decimal(0)
  )
  const refundedAmount = successfulPayments.reduce(
    (sum, payment) =>
      sum.plus(
        (payment.refunds || [])
          .filter((refund) => refund.status === 'SUCCEEDED')
          .reduce((refundSum, refund) => refundSum.plus(refund.amount), decimal(0))
      ),
    decimal(0)
  )
  const netPaidAmount = paidAmount.minus(refundedAmount)
  const balance = decimal(obligation.totalAmount).minus(netPaidAmount)
  return {
    ...obligation,
    paidAmount,
    refundedAmount,
    netPaidAmount,
    balanceDue: balance,
    status:
      balance.isZero() && refundedAmount.gte(paidAmount) && paidAmount.gt(0)
        ? OBLIGATION_STATUS.REFUNDED
        : balance.isZero()
        ? OBLIGATION_STATUS.PAID
        : paidAmount.isZero()
          ? OBLIGATION_STATUS.UNPAID
          : OBLIGATION_STATUS.PARTIALLY_PAID,
  }
}

const getObligation = async (id, appId, db) => {
  if (!id || !appId) throw new TypeError('id and appId are required.')
  const obligation = await findObligationById(id, appId, db)
  if (!obligation) return null
  return summarizeObligation(
    obligation,
    obligation.payments.filter((p) => p.status === PAYMENT_STATUS.SUCCEEDED)
  )
}

const createPaymentObligation = async ({
  appId,
  referenceType,
  referenceId,
  totalAmount,
  currency,
  metadata = undefined,
  db,
}) => {
  if (!appId || !referenceType || !referenceId || !currency) {
    throw new TypeError('appId, referenceType, referenceId, and currency are required.')
  }
  const amount = decimal(totalAmount)
  if (amount.lte(0)) throw new TypeError('totalAmount must be greater than zero.')
  return createObligation({
    appId,
    referenceType,
    referenceId,
    currency: currency.toUpperCase(),
    totalAmount: amount,
    metadata,
  }, db)
}

const recordPayment = async ({
  appId,
  obligationId,
  amount,
  currency,
  method = null,
  provider = null,
  providerReference = null,
  idempotencyKey,
  metadata = undefined,
  actorId = null,
  db,
  onSettled = null,
}) => {
  if (!appId || !obligationId || !currency) {
    throw new TypeError('appId, obligationId, and currency are required.')
  }
  if (!idempotencyKey) throw new TypeError('idempotencyKey is required.')
  const existing = await findPaymentByIdempotencyKey(idempotencyKey, db)
  if (existing) return existing

  return withTransaction(async (tx) => {
    await lockObligation(obligationId, appId, tx)
    const obligation = await findObligationById(obligationId, appId, tx)
    if (!obligation) throw new PaymentStateError('Payment obligation was not found.')
    if (obligation.currency !== currency.toUpperCase()) throw new PaymentStateError('Payment currency does not match the obligation currency.')

    const successfulPayments = obligation.payments.filter(
      (payment) => payment.status === PAYMENT_STATUS.SUCCEEDED
    )
    const paid = successfulPayments.reduce((sum, payment) => {
      const refunded = (payment.refunds || [])
        .filter((refund) => refund.status === 'SUCCEEDED')
        .reduce((inner, refund) => inner.plus(refund.amount), decimal(0))
      return sum.plus(decimal(payment.amount).minus(refunded))
    }, decimal(0))
    const balance = decimal(obligation.totalAmount).minus(paid)
    assertWithinBalance(amount, balance)

    const payment = await createPayment({
      obligationId,
      amount: decimal(amount),
      currency: currency.toUpperCase(),
      method,
      provider,
      providerReference,
      status: PAYMENT_STATUS.SUCCEEDED,
      idempotencyKey,
      metadata,
      paidAt: new Date(),
    }, tx)

    const nextBalance = balance.minus(payment.amount)
    const nextStatus = nextBalance.isZero()
      ? OBLIGATION_STATUS.PAID
      : OBLIGATION_STATUS.PARTIALLY_PAID

    await updateObligationStatus(obligationId, nextStatus, tx)

    if (onSettled) {
      await onSettled({
        db: tx,
        obligation: { ...obligation, status: nextStatus },
        payment,
        paidAmount: paid.plus(payment.amount),
        balanceDue: nextBalance,
      })
    }

    const after = {
      appId,
      obligationId,
      paymentId: payment.id,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      obligationStatus: nextStatus,
      balanceDue: nextBalance.toString(),
    }

    await recordAudit({
      actorId,
      appId,
      action: 'payment.succeeded',
      entityType: 'Payment',
      entityId: payment.id,
      after,
      db: tx,
    })

    await enqueueEvent({
      db: tx,
      event: PAYMENT_EVENTS.SUCCEEDED,
      entityType: 'Payment',
      entityId: payment.id,
      actorId,
      context: { appId, obligationId, amount: payment.amount.toString(), currency: payment.currency },
      idempotencyKey: `payment.succeeded:${payment.id}`,
    })

    await enqueueEvent({
      db: tx,
      event: nextStatus === OBLIGATION_STATUS.PAID ? PAYMENT_EVENTS.OBLIGATION_PAID : PAYMENT_EVENTS.OBLIGATION_PARTIALLY_PAID,
      entityType: 'PaymentObligation',
      entityId: obligationId,
      actorId,
      context: { appId, paymentId: payment.id, balanceDue: nextBalance.toString() },
      idempotencyKey: `payment.obligation:${obligationId}:${payment.id}`,
    })

    return payment
  })
}

const createCheckout = async ({
  appId,
  obligationId,
  amount,
  provider,
  description,
  successUrl,
  cancelUrl,
  idempotencyKey,
  metadata,
  db,
}) => {
  if (!idempotencyKey) throw new TypeError('idempotencyKey is required.')
  const obligation = await getObligation(obligationId, appId, db)
  if (!obligation) throw new PaymentStateError('Payment obligation was not found.')
  const checkoutAmount = positiveDecimal(amount, 'amount')
  if (compare(checkoutAmount, obligation.balanceDue) > 0) {
    throw new PaymentStateError('Payment amount exceeds the outstanding balance.')
  }
  const paymentProvider = getPaymentProvider(provider)
  return paymentProvider.createCheckout({
    amount: checkoutAmount.toString(),
    currency: obligation.currency,
    referenceNumber: obligationId,
    description,
    successUrl,
    cancelUrl,
    idempotencyKey,
    metadata: { ...(metadata || {}), appId, obligationId },
  })
}

const getPayment = async (id, appId, db) => findPaymentById(id, appId, db)

const listPaymentHistory = async ({ appId, obligationId }) => {
  const rows = await listPayments(obligationId, appId)
  return rows.map((payment) => ({
    ...payment,
    amount: payment.amount.toString(),
    refunds: (payment.refunds || []).map((refund) => ({
      ...refund,
      amount: refund.amount.toString(),
    })),
  }))
}

const refundPayment = async ({
  appId,
  paymentId,
  amount,
  currency,
  reason = null,
  actorId = null,
  idempotencyKey,
  manual = false,
  db = null,
}) => {
  if (!idempotencyKey) throw new TypeError('idempotencyKey is required.')
  const payment = await findPaymentById(paymentId, appId, db)
  if (!payment || payment.status !== PAYMENT_STATUS.SUCCEEDED) {
    throw new PaymentStateError('Successful payment was not found.')
  }
  const refundAmount = positiveDecimal(amount, 'amount')
  const refunded = (payment.refunds || [])
    .filter((refund) => refund.status === 'SUCCEEDED')
    .reduce((sum, refund) => sum.plus(refund.amount), decimal(0))
  const refundable = decimal(payment.amount).minus(refunded)
  if (compare(refundAmount, refundable) > 0) {
    throw new PaymentStateError('Refund amount exceeds the refundable payment amount.')
  }

  let providerReference = null
  if (!manual && payment.provider) {
    const provider = getPaymentProvider(payment.provider)
    if (typeof provider.refundPayment !== 'function') {
      throw new PaymentStateError(`Payment provider ${payment.provider} does not support refunds through the configured adapter.`)
    }
    const result = await provider.refundPayment({
      providerReference: payment.providerReference,
      amount: refundAmount.toString(),
      currency: currency || payment.currency,
      reason,
    })
    providerReference = result?.providerReference || null
  }

  const execute = async (tx) => {
    await lockPayment(paymentId, appId, tx)
    const current = await findPaymentById(paymentId, appId, tx)
    if (!current || current.status !== PAYMENT_STATUS.SUCCEEDED) {
      throw new PaymentStateError('Successful payment was not found.')
    }
    const currentRefunded = (current.refunds || [])
      .filter((refund) => refund.status === 'SUCCEEDED')
      .reduce((sum, refund) => sum.plus(refund.amount), decimal(0))
    const currentRefundable = decimal(current.amount).minus(currentRefunded)
    if (compare(refundAmount, currentRefundable) > 0) {
      throw new PaymentStateError('Refund amount exceeds the refundable payment amount.')
    }

    const refund = await createRefund({
      paymentId,
      amount: refundAmount,
      currency: currency || current.currency,
      status: 'SUCCEEDED',
      providerReference,
      reason,
      refundedAt: new Date(),
      metadata: { manual },
    }, tx)

    const obligation = await findObligationById(current.obligationId, appId, tx)
    if (obligation) {
      const successfulPayments = obligation.payments.filter((item) => item.status === PAYMENT_STATUS.SUCCEEDED)
      const totalPaid = successfulPayments.reduce((sum, item) => sum.plus(item.amount), decimal(0))
      const totalRefunded = successfulPayments.reduce((sum, item) => sum.plus((item.refunds || []).filter((itemRefund) => itemRefund.status === 'SUCCEEDED').reduce((inner, itemRefund) => inner.plus(itemRefund.amount), decimal(0))), decimal(0)).plus(refund.amount)
      if (totalPaid.gt(0)) {
        const refundStatus = totalRefunded.gte(totalPaid)
          ? OBLIGATION_STATUS.REFUNDED
          : OBLIGATION_STATUS.PARTIALLY_REFUNDED
        if (totalRefunded.gt(0)) {
          await updateObligationStatus(current.obligationId, refundStatus, tx)
        }
      }
    }

    await recordAudit({
      actorId,
      appId,
      action: 'payment.refunded',
      entityType: 'PaymentRefund',
      entityId: refund.id,
      after: { paymentId, amount: refundAmount.toString(), currency: refund.currency, providerReference, reason },
      db: tx,
    })

    await enqueueEvent({
      db: tx,
      event: PAYMENT_EVENTS.REFUNDED,
      entityType: 'PaymentRefund',
      entityId: refund.id,
      actorId,
      context: { appId, paymentId, amount: refundAmount.toString(), currency: refund.currency },
      idempotencyKey: `payment.refunded:${refund.id}`,
    })

    return refund
  }
  return db ? execute(db) : withTransaction(execute)
}

export {
  createPaymentObligation,
  getObligation,
  recordPayment,
  createCheckout,
  summarizeObligation,
  listPaymentHistory,
  getPayment,
  refundPayment,
}