import express from 'express'
import { asyncHandler, validate, idempotency } from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize, { authorizeResource } from '../../../platform/authorization/authorization.middleware.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './receiving.service.js'
import { hasReceivingTaskAccess } from './receiving.authorization.js'
import * as applicationDocumentController from '../documents/document.controller.js'
import * as controller from './receiving.controller.js'
import * as validation from './receiving.validation.js'
import { applicationDocumentsParamsValidator, updateDocumentReceiptValidator } from '../documents/document.validation.js'

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'obo-receiving', required: true })
const loadApplication = (id, req) => service.getForAuthorization(id, getApplicationId(req))
const authorizeReceivingApplication = authorizeResource({ resource: 'obo_plan_permits', action: 'receive', loadResource: loadApplication, policy: hasReceivingTaskAccess, getResourceId: (req) => req.params.id })

router.get('/applications', authenticate, authorize('obo_plan_permits', 'receive'), validate(validation.listValidator), asyncHandler(controller.list))
router.get('/applications/:id', authenticate, authorizeReceivingApplication, validate(validation.applicationParamsValidator), asyncHandler(controller.get))
router.post('/applications/:id/receive', authenticate, authorizeReceivingApplication, requireIdempotency, validate(validation.applicationParamsValidator), asyncHandler(controller.receive))
router.post('/applications/:id/decision', authenticate, authorizeReceivingApplication, requireIdempotency, validate(validation.decisionValidator), asyncHandler(controller.decide))
router.get('/applications/:id/documents', authenticate, authorizeReceivingApplication, validate(applicationDocumentsParamsValidator), asyncHandler(applicationDocumentController.list))
router.patch('/applications/:id/documents/:requirementId', authenticate, authorizeReceivingApplication, requireIdempotency, validate(updateDocumentReceiptValidator), asyncHandler(applicationDocumentController.update))

export default router
