import express from 'express'
import {
  asyncHandler,
  validate,
  idempotency,
} from '../../../common/middleware/index.js'
import authenticate from '../../../features/auth/authenticate.secure.js'
import authorize, {
  authorizeResource,
} from '../../../platform/authorization/authorization.middleware.js'
import { ownershipPolicy } from '../../../platform/authorization/authorization.policy.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as repository from './document.repository.js'
import {
  DOCUMENT_MODULE,
  DOCUMENT_ACTIONS,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from '../../../features/documents/document.constants.js'
import {
  documentIdValidator,
  documentUploadValidator,
} from './document.validation.js'
import * as controller from './document.controller.js'

const router = express.Router()

const requireIdempotency = idempotency({
  scope: 'obo-documents',
  required: true,
})

const loadOwnedDocument = (id, req) =>
  repository.findOwnedDocument({
    id,
    userId: req.user.id,
    appId: getApplicationId(req),
  })

const authorizeOwnedDocument = (action) =>
  authorizeResource({
    resource: DOCUMENT_MODULE,
    action,
    loadResource: loadOwnedDocument,
    policy: ownershipPolicy,
    getOwnerId: (document) => document.ownerId,
  })

router.post(
  '/',
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.UPLOAD),
  requireIdempotency,
  express.raw({
    type: '*/*',
    limit: DEFAULT_MAX_FILE_SIZE_BYTES,
  }),
  validate(documentUploadValidator),
  asyncHandler(controller.uploadDocument)
)

router.get(
  '/',
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ),
  asyncHandler(controller.listDocuments)
)

router.get(
  '/:id',
  authenticate,
  authorizeOwnedDocument(DOCUMENT_ACTIONS.READ),
  validate(documentIdValidator),
  asyncHandler(controller.getDocument)
)

router.get(
  '/:id/download',
  authenticate,
  authorizeOwnedDocument(DOCUMENT_ACTIONS.READ),
  validate(documentIdValidator),
  asyncHandler(controller.downloadDocument)
)

router.delete(
  '/:id',
  authenticate,
  authorizeOwnedDocument(DOCUMENT_ACTIONS.DELETE),
  requireIdempotency,
  validate(documentIdValidator),
  asyncHandler(controller.deleteDocument)
)

export default router
