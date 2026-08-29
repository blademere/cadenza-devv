const express = require('express')
const { asyncHandler, validate, idempotency } = require('../../common/middleware')
const authenticate = require('../auth/authenticate.secure')
const authorize = require('../../platform/authorization/authorize')
const authorizeResource = require('../../platform/authorization/authorizeResource')
const { ownershipPolicy } = require('../../platform/authorization/access-control.policy')
const repository = require('./document.repository')
const { DOCUMENT_MODULE, DOCUMENT_ACTIONS, DEFAULT_MAX_FILE_SIZE_BYTES } = require('./document.constants')
const { documentIdValidator, documentUploadValidator } = require('./document.validation')
const controller = require('./document.controller')

const router = express.Router()
const requireIdempotency = idempotency({ scope: 'documents', required: true })
const loadOwnedDocument = (id, req) => repository.findOwnedDocument({ id: Number(id), userId: req.user.id })
const authorizeOwnedDocument = (action) => authorizeResource({
  resource: DOCUMENT_MODULE,
  action,
  loadResource: loadOwnedDocument,
  policy: ownershipPolicy,
  getOwnerId: (document) => document.ownerId,
})

router.post('/', authenticate, authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.UPLOAD), requireIdempotency, express.raw({ type: '*/*', limit: DEFAULT_MAX_FILE_SIZE_BYTES }), validate(documentUploadValidator), asyncHandler(controller.uploadDocumentController))
router.get('/', authenticate, authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ), asyncHandler(controller.listDocumentsController))
router.get('/:id', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.READ), validate(documentIdValidator), asyncHandler(controller.getDocumentController))
router.get('/:id/download', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.READ), validate(documentIdValidator), asyncHandler(controller.downloadDocumentController))
router.delete('/:id', authenticate, authorizeOwnedDocument(DOCUMENT_ACTIONS.DELETE), requireIdempotency, validate(documentIdValidator), asyncHandler(controller.deleteDocumentController))
module.exports = router
