const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const { createUserController, listUsersController, assignUserRoleController } = require('./user.controller')
const { createUserValidator, listUsersValidator, assignUserRoleValidator } = require('./user.validation')
const userRouter = express.Router()
const requireIdempotency = idempotency({ scope: 'users', required: true })

userRouter.get('/', authenticate, authorize('users', 'read'), validate(listUsersValidator), asyncHandler(listUsersController))
userRouter.post('/', authenticate, authorize('users', 'create'), requireIdempotency, validate(createUserValidator), asyncHandler(createUserController))
userRouter.patch('/:userId/role', authenticate, authorize('authorization', 'manage'), requireIdempotency, validate(assignUserRoleValidator), asyncHandler(assignUserRoleController))

module.exports = userRouter
