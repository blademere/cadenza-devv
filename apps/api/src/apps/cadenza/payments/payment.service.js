import { positiveDecimal, compare } from '../../../platform/money/money.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { getObligation, getPayment, recordPayment, createCheckout, getCheckoutStatus, listPaymentHistory, refundPayment } from '../../../platform/payments/payment.service.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import { env } from '../../../config/index.js'
import * as repository from './payment.repository.js'
import { beforeRecord, onSettled } from './payment-workflow.js'

const withObligationQuery = (baseUrl, obligationId, result) => {
  if (!baseUrl) return baseUrl
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}obligationId=${encodeURIComponent(obligationId)}&result=${encodeURIComponent(result)}`
}

const assertOwnership = async ({ appId, obligationId, actorId }) => {
  const owner = requireAppId(appId)
  if (await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_payments', action: 'manage' }))
    return
  const obligation = await getObligation(obligationId, owner)
  if (!obligation) throw new NotFoundError('Payment obligation not found.')
  const row =
    obligation.referenceType === 'CADENZA_RENTAL'
      ? await repository.findRental(obligation.referenceId, owner)
      : obligation.referenceType === 'CADENZA_ENROLLMENT'
        ? await repository.findEnrollment(obligation.referenceId, owner)
        : null
  const userId = row?.customer?.person?.userId ?? row?.student?.person?.userId
  if (Number(userId) !== Number(actorId))
    throw new NotFoundError('Payment obligation not found.')
}

const pay = async ({
  appId,
  obligationId,
  amount,
  currency,
  method,
  provider,
  providerReference,
  idempotencyKey,
  metadata,
  actorId,
}) => {
  const owner = requireAppId(appId)
  await assertOwnership({ appId: owner, obligationId, actorId })
  let paymentAmount
  try {
    paymentAmount = positiveDecimal(amount, 'amount')
  } catch {
    throw new BadRequestError('amount must be greater than zero.')
  }
  const obligation = await getObligation(obligationId, owner)
  if (!obligation) throw new NotFoundError('Payment obligation not found.')
  await beforeRecord({ appId: owner, obligationId, amount: paymentAmount })
  let settledObligation = null
  const payment = await recordPayment({
    appId: owner,
    obligationId,
    amount: paymentAmount,
    currency,
    method,
    provider,
    providerReference,
    idempotencyKey,
    metadata,
    actorId,
    onSettled: async ({ db, obligation: settled, paidAmount }) => {
      settledObligation = { ...settled, paidAmount }
      await onSettled({ db, obligation: settled, paidAmount })
    },
  })
  const after = settledObligation ?? (await getObligation(obligationId, owner))
  if (!after) throw new NotFoundError('Payment obligation not found.')
  return { payment, obligation: after }
}

const checkout = async ({ appId, obligationId, amount, description, idempotencyKey, actorId }) => {
  await assertOwnership({ appId, obligationId, actorId })
  const owner = requireAppId(appId)
  const obligation = await getObligation(obligationId, owner)
  if (!obligation) throw new NotFoundError('Payment obligation not found.')
  if (obligation.referenceType === 'CADENZA_ENROLLMENT' && compare(amount, obligation.balanceDue) !== 0)
    throw new ForbiddenError('Lesson enrollment checkout requires full payment.')
  return createCheckout({
    appId: owner,
    obligationId,
    amount,
    provider: 'XENDIT',
    description: description || 'Cadenza payment',
    successUrl: withObligationQuery(env.XENDIT_SUCCESS_URL, obligationId, 'success'),
    cancelUrl: withObligationQuery(env.XENDIT_FAILURE_URL, obligationId, 'failure'),
    idempotencyKey,
    metadata: { applicationKey: 'cadenza' },
  })
}

const sync = async ({ appId, obligationId, actorId }) => {
  const owner = requireAppId(appId)
  await assertOwnership({ appId: owner, obligationId, actorId })
  const obligation = await getObligation(obligationId, owner)
  if (!obligation) throw new NotFoundError('Payment obligation not found.')
  if (obligation.status === 'PAID') return { status: obligation.status, obligation, reconciled: false }

  const checkout = await getCheckoutStatus({ appId: owner, obligationId, provider: 'XENDIT' })
  if (!checkout) return { status: 'NOT_STARTED', obligation, reconciled: false }
  if (checkout.referenceId !== obligationId) throw new BadRequestError('Payment provider reference does not match the payment obligation.')
  if (checkout.currency?.toUpperCase() !== obligation.currency.toUpperCase()) throw new BadRequestError('Payment provider currency does not match the payment obligation.')
  if (checkout.status !== 'SUCCEEDED') return { status: checkout.status || 'PENDING', obligation, reconciled: false }
  if (!checkout.providerReference) return { status: 'SUCCEEDED', obligation, reconciled: false }

  const amount = checkout.amount
  if (!amount || compare(amount, obligation.balanceDue) > 0) throw new BadRequestError('Payment provider amount exceeds the outstanding balance.')
  await beforeRecord({ appId: owner, obligationId, amount })
  await recordPayment({
    appId: owner,
    obligationId,
    amount,
    currency: checkout.currency,
    method: checkout.method,
    provider: 'XENDIT',
    providerReference: checkout.providerReference,
    idempotencyKey: `XENDIT:${checkout.providerReference}`,
    metadata: { ...checkout.metadata, appId: owner, applicationKey: 'cadenza', checkoutSessionId: checkout.paymentRequestId, reconciled: true },
    actorId,
    onSettled: async ({ db, obligation: settled, paidAmount }) => onSettled({ db, obligation: settled, paidAmount }),
  })
  return { status: 'RECONCILED', obligation: await getObligation(obligationId, owner), reconciled: true }
}

const get = async ({ appId, obligationId, actorId }) => {
  await assertOwnership({ appId, obligationId, actorId })
  const value = await getObligation(obligationId, requireAppId(appId))
  if (!value) throw new NotFoundError('Payment obligation not found.')
  return value
}

const history = async ({ appId, obligationId, actorId }) => {
  await assertOwnership({ appId, obligationId, actorId })
  return listPaymentHistory({ appId: requireAppId(appId), obligationId })
}

const getPaymentResource = async ({ appId, paymentId }) => {
  const owner = requireAppId(appId)
  const payment = await getPayment(paymentId, owner)
  if (!payment) return null
  const obligation = await getObligation(payment.obligationId, owner)
  if (!obligation || !['CADENZA_RENTAL', 'CADENZA_ENROLLMENT'].includes(obligation.referenceType)) return null
  return { ...payment, appId: owner }
}

const refund = async ({ appId, paymentId, amount, currency, reason, actorId, manual = true, idempotencyKey }) => {
  const owner = requireAppId(appId)
  if (!(await can({ userId: Number(actorId), appId: owner, resource: 'cadenza_payments', action: 'manage' }))) {
    throw new ForbiddenError('Only payment management staff can issue refunds.')
  }
  return refundPayment({
    appId: owner,
    paymentId,
    amount,
    currency,
    reason,
    actorId,
    manual,
    idempotencyKey,
  })
}

export { pay, get, checkout, sync, history, getPaymentResource, refund }