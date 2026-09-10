import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import {
  createUserController,
  listUsersController,
  assignUserRoleController,
  getMyProfileController,
  createMyProfileController,
  updateMyProfileController,
} from './user.controller.js'
import {
  createUserValidator,
  listUsersValidator,
  assignUserRoleValidator,
  createMyProfileValidator,
  updateMyProfileValidator,
} from './user.validation.js'

const userRouter = express.Router()
const requireIdempotency = idempotency({ scope: 'users', required: true })

userRouter.get('/me/profile', authenticate, /* authorization: auth-boundary — authenticated user accesses only their own profile */ asyncHandler(getMyProfileController))
userRouter.post('/me/profile', authenticate, /* authorization: auth-boundary — authenticated user creates only their own profile */ requireIdempotency, validate(createMyProfileValidator), asyncHandler(createMyProfileController))
userRouter.patch('/me/profile', authenticate, /* authorization: auth-boundary — authenticated user updates only their own profile */ validate(updateMyProfileValidator), asyncHandler(updateMyProfileController))
userRouter.get('/', authenticate, authorize('users', 'read'), validate(listUsersValidator), asyncHandler(listUsersController))
userRouter.post('/', authenticate, authorize('users', 'create'), requireIdempotency, validate(createUserValidator), asyncHandler(createUserController))
userRouter.patch('/:userId/role', authenticate, authorize('authorization', 'manage'), requireIdempotency, validate(assignUserRoleValidator), asyncHandler(assignUserRoleController))

export default userRouter
