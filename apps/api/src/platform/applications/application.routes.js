import express from 'express'
import { asyncHandler, idempotency } from '../../common/middleware/index.js'
import { csrfProtection } from '../../common/middleware/csrf.js'
import authenticate from '../../features/auth/authenticate.secure.js'
import {
  listUserApplicationsController,
  getUserApplicationController,
  selectApplicationController,
} from './application.controller.js'

const router = express.Router()
const requireApplicationSelectionIdempotency = idempotency({ scope: 'application-selection', required: true })

router.get('/', authenticate, asyncHandler(listUserApplicationsController) /* authorization: auth-boundary */)
router.get('/:appKey', authenticate, asyncHandler(getUserApplicationController) /* authorization: auth-boundary */)
router.post(
  '/:appKey/select',
  authenticate,
  csrfProtection,
  requireApplicationSelectionIdempotency,
  asyncHandler(selectApplicationController) /* authorization: auth-boundary */,
)

export default router
