const express = require('express')
const { asyncHandler, validate } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const { listAuditLogsController, timelineController } = require('./audit.controller')
const { listAuditLogsValidator, timelineValidator } = require('./audit.validation')
const auditRouter = express.Router()
const auditRead = [authenticate, authorize('audit_logs', 'read')]
auditRouter.get('/', ...auditRead, validate(listAuditLogsValidator), asyncHandler(listAuditLogsController))
auditRouter.get('/timeline/:entityType/:entityId', ...auditRead, validate(timelineValidator), asyncHandler(timelineController))
module.exports = auditRouter
