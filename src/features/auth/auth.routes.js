const express = require("express")

const { asyncHandler, validate } = require("../../common/middleware")

const { loginController, refreshController } = require("./auth.controller")

const { loginValidator, refreshTokenValidator } = require("./auth.validation")

const authRouter = express.Router()

authRouter.post(
  "/login",
  validate(loginValidator),
  asyncHandler(loginController),
)

authRouter.post(
  "/refresh",
  validate(refreshTokenValidator),
  asyncHandler(refreshController),
)

module.exports = authRouter
