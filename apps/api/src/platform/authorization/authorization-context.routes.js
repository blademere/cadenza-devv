import express from 'express'
import { asyncHandler } from '../../common/middleware/index.js'
import { successResponse } from '../../common/responses/apiResponse.js'
import { getAuthorizationContextResponse } from './authorization-context.service.js'

const createAuthorizationContextRouter = ({ authenticate }) => {
  if (typeof authenticate !== 'function') {
    throw new TypeError('createAuthorizationContextRouter requires authenticate middleware.')
  }

  const router = express.Router()

  router.get('/me/authorization', authenticate, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')

    const appId = req.security?.app?.id ?? req.appContext?.app?.id ?? req.app?.id
    const authorizationContext = await getAuthorizationContextResponse({
      userId: req.user.id,
      appId,
    })

    return successResponse(
      res,
      'Authorization context retrieved successfully.',
      authorizationContext,
    )
  }))

  return router
}

export default createAuthorizationContextRouter
