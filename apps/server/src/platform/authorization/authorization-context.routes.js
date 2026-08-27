const express = require('express')
const { asyncHandler } = require('../../common/middleware')
const { successResponse } = require('../../common/responses/apiResponse')
const repository = require('./authorization-context.repository')
const { getCapabilityRegistry } = require('./capability-registry')
const { buildAuthorizationContext } = require('./authorization-context.service')

const router = express.Router()

router.get('/me/authorization', asyncHandler(async (req, res) => {
  // Authorization state changes independently of the application shell, so a
  // previously cached GET response must never keep old navigation/permissions.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')

  const [context, modules] = await Promise.all([
    repository.getUserAuthorizationContext(req.user.id),
    repository.listActiveModules(),
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

module.exports = router
