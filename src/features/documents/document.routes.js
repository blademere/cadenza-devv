const express = require("express")
const { asyncHandler, authenticate, authorize, validate } = require("../../common/middleware")
const { DOCUMENT_MODULE, DOCUMENT_ACTIONS, DEFAULT_MAX_FILE_SIZE_BYTES } = require("./document.constants")
const { documentIdValidator } = require("./document.validation")
const controller = require("./document.controller")

const router = express.Router()

router.post(
  "/",
  authenticate,
  authorize(DOCUMENT_MODULE, DOCUMENT_ACTIONS.UPLOAD),
  express.raw({ type: "*/*", limit: DEFAULT_MAX_FILE_SIZE_BYTES }),
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
