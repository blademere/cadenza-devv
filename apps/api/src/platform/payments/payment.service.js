import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { getPrismaClient } from '../../infrastructure/database/prisma.js'
import { enqueueEvent } from '../event-bus/event-outbox.service.js'
import { recordAudit } from '../audit/audit.service.js'
import {
  createObligation,
  findObligationById,
  findObligationByReference,
  createPayment,
  findPaymentByIdempotencyKey,
  updatePayment,
  listSuccessfulPayments,
} from './payment.repository.js'
import { OBLIGATION_STATUS, PAYMENT_EVENTS, PAYMENT_STATUS } from './payment.constants.js'
import { assertWithinBalance } from './payment.policy.js'
import { PaymentStateError } from './payment.errors.js'

const prisma = getPrismaClient()
const decimal = (value) => new Prisma.Decimal(value)

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

const getObligation = async (id) => {
  const obligation = await findObligationById(id)
  if (!obligation) return null
  return summarizeObligation(obligation, obligation.payments.filter((p) => p.status === PAYMENT_STATUS.SUCCEEDED))
}

const createPaymentObligation = async ({
  referenceType,
  referenceId,
  totalAmount,
  currency,
  metadata = undefined,
  db,
}) => {
  if (!referenceType || !referenceId || !currency) throw new TypeError('referenceType, referenceId, and currency are required.')
  const amount = decimal(totalAmount)
  if (amount.lte(0)) throw new TypeError('totalAmount must be greater than zero.')
  return createObligation({
    referenceType,
    referenceId,
    currency: currency.toUpperCase(),
    totalAmount: amount,
    metadata,
  }, db)
}

const recordPayment = async ({
  obligationId,
  amount,
  currency,
  method = null,
  provider = null,
  providerReference = null,
  idempotencyKey = randomUUID(),
  metadata = undefined,
  actorId = null,
  appId = null,
  db = prisma,
}) => {
  if (!obligationId || !currency) throw new TypeError('obligationId and currency are required.')
  if (!idempotencyKey) throw new TypeError('idempotencyKey is required.')
  const existing = await findPaymentByIdempotencyKey(idempotencyKey, db)
  if (existing) return existing

  return db.$transaction(async (tx) => {
    const obligation = await findObligationById(obligationId, tx)
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

    await tx.paymentObligation.update({
      where: { id: obligationId },
      data: { status: nextStatus },
    })

    const after = {
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
