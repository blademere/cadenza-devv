import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import { createUserController, listUsersController, assignUserRoleController } from './user.controller.js'
import { createUserValidator, listUsersValidator, assignUserRoleValidator } from './user.validation.js'

const userRouter = express.Router()
const requireIdempotency = idempotency({ scope: 'users', required: true })
userRouter.get('/', authenticate, authorize('users', 'read'), validate(listUsersValidator), asyncHandler(listUsersController))
userRouter.post('/', authenticate, authorize('users', 'create'), requireIdempotency, validate(createUserValidator), asyncHandler(createUserController))
userRouter.patch('/:userId/role', authenticate, authorize('authorization', 'manage'), requireIdempotency, validate(assignUserRoleValidator), asyncHandler(assignUserRoleController))

export default userRouter
