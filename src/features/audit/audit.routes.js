const express = require('express')
const { asyncHandler, validate } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const { ACCESS_CONTROL_MODULES, ACCESS_CONTROL_ACTIONS } = require('../../platform/authorization/access-control.constants')
const { listAuditLogsController, timelineController } = require('./audit.controller')
const { listAuditLogsValidator, timelineValidator } = require('./audit.validation')
const auditRouter = express.Router()
const auditRead = [authenticate, authorize(ACCESS_CONTROL_MODULES.AUDIT_LOGS, ACCESS_CONTROL_ACTIONS.READ)]
auditRouter.get('/', ...auditRead, validate(listAuditLogsValidator), asyncHandler(listAuditLogsController))
auditRouter.get('/timeline/:entityType/:entityId', ...auditRead, validate(timelineValidator), asyncHandler(timelineController))
module.exports = auditRouter
