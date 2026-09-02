import { successResponse } from '../../common/responses/apiResponse.js'
import service from './document.service.js'

const normalize = (document) => ({
  ...document,
  sizeBytes:
    typeof document.sizeBytes === 'bigint'
      ? document.sizeBytes.toString()
      : document.sizeBytes,
})

const uploadDocumentController = async (req, res) => {
  const documentTypeId = req.get('x-document-type-id') || undefined
  const document = await service.uploadDocument({
    userId: req.user.id,
    fileName: req.get('x-file-name'),
    mimeType: req.get('content-type'),
    buffer: req.body,
    documentTypeId,
  })
  return successResponse(
    res,
    'Document uploaded successfully.',
    normalize(document),
    201
  )
}

const listDocumentsController = async (req, res) =>
  successResponse(
    res,
    'Documents retrieved successfully.',
    (await service.listMyDocuments({ userId: req.user.id })).map(normalize)
  )

const getDocumentController = async (req, res) =>
  successResponse(
    res,
    'Document retrieved successfully.',
    normalize(
      await service.getOwnedDocument({
        userId: req.user.id,
        id: req.validated.params.id,
      })
    )
  )

const downloadDocumentController = async (req, res) => {
  const { document, buffer } = await service.readDocument({
    userId: req.user.id,
    id: req.validated.params.id,
  })
  res.setHeader('Content-Type', document.mimeType)
  res.setHeader('Content-Length', buffer.length)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${document.originalName.replace(/"/g, '')}"`
  )
  return res.send(buffer)
}

const deleteDocumentController = async (req, res) => {
  await service.deleteDocument({
    userId: req.user.id,
    id: req.validated.params.id,
  })
  return successResponse(res, 'Document deleted successfully.', null)
}

export {
  uploadDocumentController,
  listDocumentsController,
  getDocumentController,
  downloadDocumentController,
  deleteDocumentController,
}
