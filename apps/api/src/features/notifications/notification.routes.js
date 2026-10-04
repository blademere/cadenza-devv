import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import { authorize, authorizeResource } from '../../platform/authorization/authorization.middleware.js'
import { ownershipPolicy } from '../../platform/authorization/authorization.policy.js'
import { NOTIFICATION_MODULE, NOTIFICATION_ACTIONS } from './notification.constants.js'
import * as validation from './notification.validation.js'
import * as controller from './notification.controller.js'
import * as service from './notification.service.js'
const router = express.Router()
const requireIdempotency = idempotency({ scope: 'notifications', required: true })
const loadOwnedNotification = (id, req) => service.getNotificationForUser({ id, userId: req.user.id })
const authorizeOwnedNotification = (action) => authorizeResource({ resource: NOTIFICATION_MODULE, action, loadResource: loadOwnedNotification, policy: ownershipPolicy, getOwnerId: (notification) => notification.userId })
router.get('/', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), validate(validation.listNotificationsValidator), asyncHandler(controller.listNotificationsController))
router.patch('/:id/read', authenticate, authorizeOwnedNotification(NOTIFICATION_ACTIONS.READ), requireIdempotency, validate(validation.notificationIdValidator), asyncHandler(controller.markNotificationReadController))
router.get('/preferences', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), asyncHandler(controller.listNotificationPreferencesController))
router.put('/preferences', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.READ), requireIdempotency, validate(validation.notificationPreferenceValidator), asyncHandler(controller.setNotificationPreferenceController))
router.post('/send', authenticate, authorize(NOTIFICATION_MODULE, NOTIFICATION_ACTIONS.MANAGE), requireIdempotency, validate(validation.sendNotificationValidator), asyncHandler(controller.sendNotificationController))
export default router
