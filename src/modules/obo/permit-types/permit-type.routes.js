const express = require('express')
const { asyncHandler } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const controller = require('./permit-type.controller')

const router = express.Router()
router.get('/', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.list))
router.get('/:permitTypeId/form', authenticate, authorize('obo_plan_permits', 'read'), asyncHandler(controller.getForm))

module.exports = router
