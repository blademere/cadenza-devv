const express = require("express");

const { asyncHandler, authenticate, authorize, validate } = require("../../common/middleware");
const { createUserController, listUsersController } = require("./user.controller");
const { createUserValidator, listUsersValidator } = require("./user.validation");

const userRouter = express.Router();

userRouter.get(
  "/",
  authenticate,
  authorize(["admin", "staff"]),
  validate(listUsersValidator),
  asyncHandler(listUsersController),
);

userRouter.post(
  "/",
  authenticate,
  authorize(["admin"]),
  validate(createUserValidator),
  asyncHandler(createUserController),
);

module.exports = userRouter;
