import express from 'express'
import {
  asyncHandler,
  validate,
  idempotency,
} from '../../../common/middleware/index.js'
import { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './payment.controller.js'
import * as service from './payment.service.js'
import { getValidator, payValidator, checkoutValidator } from './payment.validation.js'
const router = express.Router()
const resource = authorizeResource({
  resource: 'cadenza_payments',
  action: 'read',
  loadResource: (id, req) =>
    service.get({ obligationId: id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.obligationId,
})
router.get(
  '/:obligationId',
  resource,
  validate(getValidator),
  asyncHandler(controller.get)
)
const payResource = authorizeResource({
  resource: 'cadenza_payments',
  action: 'create',
  loadResource: (id, req) =>
    service.get({ obligationId: id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.obligationId,
})
router.post(
  '/:obligationId/checkout',
  payResource,
  idempotency({ scope: 'cadenza-payment-checkout', required: true }),
  validate(checkoutValidator),
  asyncHandler(controller.checkout)
)
router.post(
  '/:obligationId/pay',
  payResource,
  idempotency({ scope: 'cadenza-payments', required: true }),
  validate(payValidator),
  asyncHandler(controller.pay)
)
export default router
