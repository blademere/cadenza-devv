const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const authorizeResource = require('../../platform/authorization/authorizeResource')
const { ownershipPolicy } = require('../../platform/authorization/access-control.policy')
const { NOTIFICATION_MODULE, NOTIFICATION_ACTIONS } = require('./notification.constants')
const validation = require('./notification.validation')
const controller = require('./notification.controller')
const service = require('./notification.service')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'notifications', required: true })
const loadOwnedNotification = (id, req) => service.getNotificationForUser({ id, userId: req.user.id })
const authorizeOwnedNotification = (action) => authorizeResource({
  resource: NOTIFICATION_MODULE,
  action,
  loadResource: loadOwnedNotification,
  policy: ownershipPolicy,
  getOwnerId: (notification) => notification.userId,
})

router.get('/', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), validate(validation.listNotificationsValidator), asyncHandler(controller.listNotificationsController))
router.patch('/:id/read', authenticate, authorizeOwnedNotification(NOTIFICATION_ACTIONS.READ), requireIdempotency, validate(validation.notificationIdValidator), asyncHandler(controller.markNotificationReadController))
router.get('/preferences', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), asyncHandler(controller.listNotificationPreferencesController))
router.put('/preferences', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), requireIdempotency, validate(validation.notificationPreferenceValidator), asyncHandler(controller.setNotificationPreferenceController))
router.post('/send', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.MANAGE), requireIdempotency, validate(validation.sendNotificationValidator), asyncHandler(controller.sendNotificationController))
module.exports = router
