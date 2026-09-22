import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './customer.controller.js'
import * as service from './customer.service.js'
import { createValidator, updateValidator, idValidator } from './customer.validation.js'

const router = express.Router()

router.post('/me', idempotency({ scope: 'cadenza-customer-self', required: true }), asyncHandler(controller.registerMe))
router.get('/', authorize('cadenza_rentals', 'manage'), asyncHandler(controller.list))
router.post('/', authorize('cadenza_rentals', 'manage'), idempotency({ scope: 'cadenza-customers', required: true }), validate(createValidator), asyncHandler(controller.create))
router.get('/:id', authorizeResource({
  resource: 'cadenza_rentals',
  action: 'read',
  loadResource: (id, req) => service.get({ id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.id,
}), validate(idValidator), asyncHandler(controller.get))
router.patch('/:id', authorizeResource({
  resource: 'cadenza_rentals',
  action: 'manage',
  loadResource: (id, req) => service.get({ id, appId: req.security.app.id, actorId: req.user?.id }),
  getResourceId: (req) => req.params.id,
}), idempotency({ scope: 'cadenza-customers-update', required: true }), validate(updateValidator), asyncHandler(controller.update))

export default router
