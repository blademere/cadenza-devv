const express = require('express')

const {
  loginController,
  refreshAccessTokenController,
  logoutController,
} = require('./auth.controller')
const { loginValidator } = require('./auth.validation')
const { asyncHandler } = require('../../common/middleware')
const validate = require('../../common/middleware/validate')
const { csrfProtection } = require('../../common/middleware/csrf')
const authRouter = express.Router()

authRouter.post(
  '/login',
  validate(loginValidator),
  asyncHandler(loginController)
)

authRouter.post(
  '/refresh',
  csrfProtection,
  asyncHandler(refreshAccessTokenController)
)

authRouter.post('/logout', csrfProtection, asyncHandler(logoutController))

module.exports = authRouter
