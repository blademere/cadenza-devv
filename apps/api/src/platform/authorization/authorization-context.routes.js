import express from 'express'
import { asyncHandler } from '../../common/middleware/index.js'
import authenticate from '../../features/auth/authenticate.secure.js'
import { successResponse } from '../../common/responses/apiResponse.js'
import { getUserAuthorizationContext, listActiveModules } from './authorization-context.repository.js'
import { getCapabilityRegistry } from './capability-registry.js'
import { buildAuthorizationContext } from './authorization-context.service.js'

const router = express.Router()

router.get('/me/authorization', authenticate, asyncHandler(async (req, res) => {
  // Authorization state changes independently of the application shell, so a
  // previously cached GET response must never keep old navigation/permissions.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')

  const [context, modules] = await Promise.all([
    getUserAuthorizationContext(req.user.id),
    listActiveModules(),
  ])

  const authorizationContext = buildAuthorizationContext({
    context,
    modules,
    capabilities: getCapabilityRegistry(),
  })

  return successResponse(
    res,
    'Authorization context retrieved successfully.',
    authorizationContext,
  )
}))

export default router
