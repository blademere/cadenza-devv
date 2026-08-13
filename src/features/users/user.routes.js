const express = require("express")

const {
  asyncHandler,
  authenticate,
  authorize,
  validate,
} = require("../../common/middleware")

const {
  createUserController,
  listUsersController,
} = require("./user.controller")

const { createUserValidator, listUsersValidator } = require("./user.validation")

const userRouter = express.Router()

userRouter.get(
  "/",
  authenticate,
  authorize("users", "read"),
  validate(listUsersValidator),
  asyncHandler(listUsersController),
)

userRouter.post(
  "/",
  authenticate,
  authorize("users", "create"),
  validate(createUserValidator),
  asyncHandler(createUserController),
)

module.exports = userRouter
