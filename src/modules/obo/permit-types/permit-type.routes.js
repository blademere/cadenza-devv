const express = require('express')
const { asyncHandler } = require('../../../common/middleware')
const authenticate = require('../../../features/auth/authenticate.secure')
const authorize = require('../../../platform/authorization/authorize')
const controller = require('./permit-type.controller')

const router = express.Router()
router.get('/', authenticate, authorize('applications', 'read'), asyncHandler(controller.list))

module.exports = router
