import { enqueueEvent } from '../event-bus/event-outbox.service.js'
import { recordAudit } from '../audit/audit.service.js'
import {
  createObligation,
  findObligationById,
  createPayment,
  findPaymentByIdempotencyKey,
  listSuccessfulPayments,
  withTransaction,
  lockObligation,
  updateObligationStatus,
} from './payment.repository.js'
import { OBLIGATION_STATUS, PAYMENT_EVENTS, PAYMENT_STATUS } from './payment.constants.js'
import { assertWithinBalance } from './payment.policy.js'
import { PaymentStateError } from './payment.errors.js'
import { toDecimal } from '../money/money.js'

const decimal = toDecimal

const summarizeObligation = (obligation, successfulPayments) => {
  const paidAmount = successfulPayments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    decimal(0)
  )
  const balance = decimal(obligation.totalAmount).minus(paidAmount)
  return {
    ...obligation,
    paidAmount,
    balanceDue: balance,
    status:
      balance.isZero()
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
  return summarizeObligation(obligation, obligation.payments.filter((p) => p.status === PAYMENT_STATUS.SUCCEEDED))
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
    await tx.$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${obligationId} AND "appId" = ${appId} FOR UPDATE`
    const obligation = await findObligationById(obligationId, appId, tx)
    if (!obligation) throw new PaymentStateError('Payment obligation was not found.')
    if (obligation.currency !== currency.toUpperCase()) throw new PaymentStateError('Payment currency does not match the obligation currency.')

    const successfulPayments = await listSuccessfulPayments(obligationId, tx)
    const paid = successfulPayments.reduce((sum, payment) => sum.plus(payment.amount), decimal(0))
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

export {
  createPaymentObligation,
  getObligation,
  recordPayment,
  summarizeObligation,
}
