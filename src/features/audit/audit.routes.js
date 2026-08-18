const express = require('express')
const { asyncHandler, authenticate, authorize, validate } = require('../../common/middleware')
const { ACCESS_CONTROL_MODULES, ACCESS_CONTROL_ACTIONS } = require('../access-control/access-control.constants')
const { listAuditLogsController, timelineController } = require('./audit.controller')
const { listAuditLogsValidator, timelineValidator } = require('./audit.validation')

const auditRouter = express.Router()

const auditRead = [
  authenticate,
  authorize(ACCESS_CONTROL_MODULES.AUDIT_LOGS, ACCESS_CONTROL_ACTIONS.READ),
]

auditRouter.get('/', ...auditRead, validate(listAuditLogsValidator), asyncHandler(listAuditLogsController))
auditRouter.get('/timeline/:entityType/:entityId', ...auditRead, validate(timelineValidator), asyncHandler(timelineController))

module.exports = auditRouter
