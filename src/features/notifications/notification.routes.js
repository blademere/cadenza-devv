const express = require("express")
const { asyncHandler, validate } = require("../../common/middleware")
const authenticate = require("../auth/authenticate")
const authorize = require("../../platform/authorization/authorize")
const { NOTIFICATION_MODULE, NOTIFICATION_ACTIONS } = require("./notification.constants")
const validation = require("./notification.validation")
const controller = require("./notification.controller")

const router = express.Router()

router.get(
  "/",
  authenticate,
  authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ),
  validate(validation.listNotificationsValidator),
  asyncHandler(controller.listNotificationsController)
)

router.patch(
  "/:id/read",
  authenticate,
  authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ),
  validate(validation.notificationIdValidator),
  asyncHandler(controller.markNotificationReadController)
)

router.get(
  "/preferences",
  authenticate,
  authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ),
  asyncHandler(controller.listNotificationPreferencesController)
)

router.put(
  "/preferences",
  authenticate,
  authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ),
  validate(validation.notificationPreferenceValidator),
  asyncHandler(controller.setNotificationPreferenceController)
)

router.post(
  "/send",
  authenticate,
  authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.MANAGE),
  validate(validation.sendNotificationValidator),
  asyncHandler(controller.sendNotificationController)
)

module.exports = router
