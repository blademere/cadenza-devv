import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authorize from '../../../platform/authorization/authorization.middleware.js'
import * as controller from './resource.controller.js'
import * as usageController from './resource.usage.controller.js'
import { createValidator } from './resource.validation.js'
import { usageValidator } from './resource.usage.validation.js'

const router = express.Router()

router.get('/:id/usage', authorize('cadenza_rentals', 'manage'), validate(usageValidator), asyncHandler(usageController.usage))

router.post(
  '/',
  authorize('cadenza_instruments', 'create'),
  idempotency({ scope: 'cadenza-resources', required: true }),
  validate(createValidator),
  asyncHandler(controller.create),
)

export default router
