const { successResponse } = require("../../common/responses/apiResponse")
const service = require("./notification.service")

const listNotificationsController = async (req, res) => {
  const result = await service.listNotifications({ userId: req.user.id, ...req.validated.query })
  return res.status(200).json({ success: true, message: "Notifications retrieved successfully.", data: result.data, pagination: result.pagination })
}

const markNotificationReadController = async (req, res) => {
  const notification = await service.markNotificationRead({ userId: req.user.id, id: req.validated.params.id })
  return successResponse(res, "Notification marked as read.", notification)
}

const sendNotificationController = async (req, res) => {
  const result = await service.sendNotification(req.validated.body)
  return successResponse(res, "Notification queued successfully.", result, 201)
}

const listNotificationPreferencesController = async (req, res) => {
  const preferences = await service.listNotificationPreferences({ userId: req.user.id })
  return successResponse(res, "Notification preferences retrieved successfully.", preferences)
}

const setNotificationPreferenceController = async (req, res) => {
  const preference = await service.setNotificationPreference({ userId: req.user.id, ...req.validated.body })
  return successResponse(res, "Notification preference updated successfully.", preference)
}

module.exports = {
  listNotificationsController,
  markNotificationReadController,
  sendNotificationController,
  listNotificationPreferencesController,
  setNotificationPreferenceController,
}
