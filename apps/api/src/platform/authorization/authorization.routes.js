import express from 'express'
import { asyncHandler } from '../../common/middleware/index.js'
import { successResponse } from '../../common/responses/apiResponse.js'
import { requireApplicationContext } from '../applications/application-context.middleware.js'
import { getAuthorizationContextResponse } from './authorization.service.js'

const createAuthorizationRouter = ({ authenticate }) => {
  if (typeof authenticate !== 'function') {
    throw new TypeError('createAuthorizationRouter requires authenticate middleware.')
  }

  const router = express.Router()

  router.get(
    '/me/authorization',
    authenticate,
    requireApplicationContext(),
    asyncHandler(async (req, res) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')

      const authorizationContext = await getAuthorizationContextResponse({
        userId: req.user.id,
        appId: req.security.app.id,
      })

      return successResponse(
        res,
        'Authorization context retrieved successfully.',
        authorizationContext,
      )
    }),
  )

  return router
}

export default createAuthorizationRouter
