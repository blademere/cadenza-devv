import express from 'express'
import { asyncHandler, validate, idempotency } from '../../common/middleware/index.js'
import authenticate from '../auth/authenticate.secure.js'
import authorize from '../../platform/authorization/authorize.js'
import authorizeResource from '../../platform/authorization/authorization-resource.middleware.js'
import { ownershipPolicy } from '../../platform/authorization/access-control.policy.js'
import * as repository from './document.repository.js'
import { DOCUMENT_MODULE, DOCUMENT_ACTIONS, DEFAULT_MAX_FILE_SIZE_BYTES } from './document.constants.js'
import { documentIdValidator, documentUploadValidator } from './document.validation.js'
import * as controller from './document.controller.js'
const router = express.Router()
const requireIdempotency = idempotency({ scope: 'documents', required: true })
const loadOwnedDocument = (id, req) => repository.findOwnedDocument({ id: Number(id), userId: req.user.id })
const authorizeOwnedDocument = (action) => authorizeResource({ resource: DOCUMENT_MODULE, action, loadResource: loadOwnedDocument, policy: ownershipPolicy, getOwnerId: (document) => document.ownerId })
router.post('/', authenticate, authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.UPLOAD), requireIdempotency, express.raw({ type: '*/*', limit: DEFAULT_MAX_FILE_SIZE_BYTES }), validate(documentUploadValidator), asyncHandler(controller.uploadDocumentController))
router.get('/', authenticate, authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ), asyncHandler(controller.listDocumentsController))
router.get('/:id', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.READ), validate(documentIdValidator), asyncHandler(controller.getDocumentController))
router.get('/:id/download', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.READ), validate(documentIdValidator), asyncHandler(controller.downloadDocumentController))
router.delete('/:id', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.DELETE), requireIdempotency, validate(documentIdValidator), asyncHandler(controller.deleteDocumentController))
export default router
