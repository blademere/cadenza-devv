import express from 'express'
import { asyncHandler, validate } from '../../common/middleware/index.js'
import authenticate from '../../features/auth/authenticate.secure.js'
import authorize from '../authorization/authorize.js'
import { requireApplicationContext } from '../applications/application-context.middleware.js'
import { listAuditLogsController, timelineController } from './audit.controller.js'
import { listAuditLogsValidator, timelineValidator } from './audit.validation.js'

const auditRouter = express.Router()
const auditRead = [authenticate, requireApplicationContext(), authorize('audit_logs', 'read')]

auditRouter.get('/', ...auditRead, validate(listAuditLogsValidator), asyncHandler(listAuditLogsController))
auditRouter.get('/timeline/:entityType/:entityId', ...auditRead, validate(timelineValidator), asyncHandler(timelineController))

export default auditRouter
