import express from 'express'
import { asyncHandler, idempotency } from '../../common/middleware/index.js'
import { csrfProtection } from '../../common/middleware/csrf.js'
import {
  listUserApplicationsController,
  getUserApplicationController,
  selectApplicationController,
} from './application.controller.js'

const createApplicationRouter = ({ authenticate, issueApplicationSession } = {}) => {
  if (typeof authenticate !== 'function') throw new TypeError('createApplicationRouter requires authenticate middleware.')
  if (typeof issueApplicationSession !== 'function') throw new TypeError('createApplicationRouter requires an application session issuer.')
  const router = express.Router()
  const requireApplicationSelectionIdempotency = idempotency({ scope: 'application-selection', required: true })

  router.get('/', authenticate, asyncHandler(listUserApplicationsController) /* authorization: auth-boundary */)
  router.get('/:appKey', authenticate, asyncHandler(getUserApplicationController) /* authorization: auth-boundary */)
  router.post(
  '/:appKey/select',
  authenticate,
  csrfProtection,
  requireApplicationSelectionIdempotency,
  asyncHandler(selectApplicationController(issueApplicationSession)) /* authorization: auth-boundary */,
)

  return router
}

export default createApplicationRouter
