const express = require("express")
const { asyncHandler, validate } = require("../../common/middleware")
const authenticate = require("../auth/authenticate")
const authorize = require("../../platform/authorization/authorize")
const { DOCUMENT_MODULE, DOCUMENT_ACTIONS, DEFAULT_MAX_FILE_SIZE_BYTES } = require("./document.constants")
const { documentIdValidator, documentUploadValidator } = require("./document.validation")
const controller = require("./document.controller")

const router = express.Router()

router.post(
  "/",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.UPLOAD),
  express.raw({ type: "*/*", limit: DEFAULT_MAX_FILE_SIZE_BYTES }),
  validate(documentUploadValidator),
  asyncHandler(controller.uploadDocumentController)
)
router.get(
  "/",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ),
  asyncHandler(controller.listDocumentsController)
)
router.get(
  "/:id",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ),
  validate(documentIdValidator),
  asyncHandler(controller.getDocumentController)
)
router.get(
  "/:id/download",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.READ),
  validate(documentIdValidator),
  asyncHandler(controller.downloadDocumentController)
)
router.delete(
  "/:id",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.DELETE),
  validate(documentIdValidator),
  asyncHandler(controller.deleteDocumentController)
)

module.exports = router
