import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import {
  createMyProfileValidator,
  updateMyProfileValidator,
} from './profile.validation.js'
import {
  getMyProfileController,
  createMyProfileController,
  updateMyProfileController,
} from './profile.controller.js'

const profileRouter = express.Router()
const requireIdempotency = idempotency({ scope: 'users-profile', required: true })

profileRouter.get(
  '/me/profile',
  authenticate,
  asyncHandler(getMyProfileController),
)

profileRouter.post(
  '/me/profile',
  authenticate,
  requireIdempotency,
  validate(createMyProfileValidator),
  asyncHandler(createMyProfileController),
)

profileRouter.patch(
  '/me/profile',
  authenticate,
  validate(updateMyProfileValidator),
  asyncHandler(updateMyProfileController),
)

export default profileRouter
