import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './payment.controller.js'
import * as service from './payment.service.js'
import { getValidator, payValidator, checkoutValidator, refundValidator } from './payment.validation.js'

const router = express.Router()

const refundResource = authorizeResource({
  resource: 'cadenza_payments',
  action: 'manage',
  loadResource: (id, req) => service.getPaymentResource({ paymentId: id, appId: req.security.app.id }),
  getResourceId: (req) => req.params.paymentId,
})

const resource = authorizeResource({
  resource: 'cadenza_payments',
  action: 'read',
  loadResource: (id, req) => service.get({ obligationId: id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.obligationId,
})

const payResource = authorizeResource({
  resource: 'cadenza_payments',
  action: 'create',
  loadResource: (id, req) => service.get({ obligationId: id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.obligationId,
})

router.get('/:obligationId', resource, validate(getValidator), asyncHandler(controller.get))
router.get('/:obligationId/history', resource, validate(getValidator), asyncHandler(controller.history))
router.post('/:obligationId/sync', payResource, validate(getValidator), asyncHandler(controller.sync))
router.post('/:obligationId/checkout', payResource, idempotency({ scope: 'cadenza-payment-checkout', required: true }), validate(checkoutValidator), asyncHandler(controller.checkout))
router.post('/:obligationId/pay', payResource, idempotency({ scope: 'cadenza-payments', required: true }), validate(payValidator), asyncHandler(controller.pay))

router.post(
  '/refunds/:paymentId',
  refundResource,
  idempotency({ scope: 'cadenza-payment-refunds', required: true }),
  validate(refundValidator),
  asyncHandler(controller.refund)
)

export default router
