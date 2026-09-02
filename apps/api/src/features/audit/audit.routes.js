import express from 'express'
import { asyncHandler, validate } from '../../common/middleware.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import { listAuditLogsController, timelineController } from './audit.controller.js'
import { listAuditLogsValidator, timelineValidator } from './audit.validation.js'

const auditRouter = express.Router()
const auditRead = [authenticate, authorize('audit_logs', 'read')]
auditRouter.get('/', ...auditRead, validate(listAuditLogsValidator), asyncHandler(listAuditLogsController))
auditRouter.get('/timeline/:entityType/:entityId', ...auditRead, validate(timelineValidator), asyncHandler(timelineController))
export default auditRouter
