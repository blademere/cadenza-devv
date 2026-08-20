const express = require('express')
const { asyncHandler } = require('../../common/middleware')
const authenticate = require('../../features/auth/authenticate.secure')
const { successResponse } = require('../../common/responses/apiResponse')
const repository = require('./authorization-context.repository')
const { getCapabilityRegistry } = require('./capability-registry')

const router = express.Router()

router.get('/me/authorization', authenticate, asyncHandler(async (req, res) => {
  const [context, modules] = await Promise.all([
    repository.getUserAuthorizationContext(req.user.id),
    repository.listActiveModules(),
  ])

  const permissionSet = new Set(
    (context?.permissions ?? []).map(({ resource, action }) => `${resource}:${action}`),
  )
  const activeModuleKeys = new Set(modules.map((module) => module.key))

  const navigation = getCapabilityRegistry().map((capability) => ({
    ...capability,
    visible: activeModuleKeys.has(capability.moduleKey) && permissionSet.has(capability.permission),
  }))

  return successResponse(res, 'Authorization context retrieved successfully.', {
    role: context?.role ?? null,
    permissions: [...permissionSet].sort(),
    modules: modules.map(({ key, name, description, isActive }) => ({
      key,
      name,
      description,
      isActive,
    })),
    navigation,
  })
}))

module.exports = router
