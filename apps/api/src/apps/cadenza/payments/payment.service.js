import { positiveDecimal, compare } from '../../../platform/money/money.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../common/errors/appError.js'
import { requireAppId } from '../../../platform/applications/application-scope.js'
import { getObligation, getPayment, recordPayment, createCheckout, listPaymentHistory, refundPayment } from '../../../platform/payments/payment.service.js'
import { can } from '../../../platform/authorization/authorization.service.js'
import { env } from '../../../config/index.js'
import * as repository from './payment.repository.js'
import { beforeRecord, onSettled } from './payment-workflow.js'

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
  const userId = row?.customerUserId ?? row?.student?.person?.userId
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
    successUrl: env.XENDIT_SUCCESS_URL,
    cancelUrl: env.XENDIT_FAILURE_URL,
    idempotencyKey,
    metadata: { applicationKey: 'cadenza' },
  })
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

export { pay, get, checkout, history, getPaymentResource, refund }