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
const {
  ACCESS_CONTROL_MODULES,
  ACCESS_CONTROL_ACTIONS,
} = require("../../platform/authorization/access-control.constants")

const userRouter = express.Router()

userRouter.get(
  "/",
  authenticate,
  authorize(ACCESS_CONTROL_MODULES.USERS, ACCESS_CONTROL_ACTIONS.READ),
  validate(listUsersValidator),
  asyncHandler(listUsersController),
)

userRouter.post(
  "/",
  authenticate,
  authorize(ACCESS_CONTROL_MODULES.USERS, ACCESS_CONTROL_ACTIONS.CREATE),
  validate(createUserValidator),
  asyncHandler(createUserController),
)

module.exports = userRouter
