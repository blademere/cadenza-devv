const express = require('express')
const { asyncHandler } = require('../../common/middleware')
const authenticate = require('../../features/auth/authenticate.secure')
const { successResponse } = require('../../common/responses/apiResponse')
const repository = require('./authorization-context.repository')
const { getCapabilityRegistry } = require('./capability-registry')
const { buildAuthorizationContext } = require('./authorization-context.service')

const router = express.Router()

router.get('/me/authorization', authenticate, asyncHandler(async (req, res) => {
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
