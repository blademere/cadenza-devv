import express from 'express'
import { asyncHandler } from '../../common/middleware/index.js'
import { successResponse } from '../../common/responses/apiResponse.js'
import { getCapabilityRegistry } from './capability-registry.js'
import { getAuthorizationContextResponse } from './authorization-context.service.js'

const createAuthorizationContextRouter = ({ authenticate }) => {
  if (typeof authenticate !== 'function') {
    throw new TypeError('createAuthorizationContextRouter requires authenticate middleware.')
  }

  const router = express.Router()

  router.get('/me/authorization', authenticate, asyncHandler(async (req, res) => {
    // Authorization state changes independently of the application shell, so a
    // previously cached GET response must never keep old navigation/permissions.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')

    const authorizationContext = await getAuthorizationContextResponse(
      req.user.id,
      getCapabilityRegistry(),
    )

    return successResponse(
      res,
      'Authorization context retrieved successfully.',
      authorizationContext,
    )
  }))

  return router
}

export default createAuthorizationContextRouter
