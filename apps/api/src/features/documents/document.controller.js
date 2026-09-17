import { successResponse } from '../../common/responses/apiResponse.js'
import * as service from './document.service.js'

const normalize = (document) => ({
  ...document,
  sizeBytes:
    typeof document.sizeBytes === 'bigint'
      ? document.sizeBytes.toString()
      : document.sizeBytes,
})

const getAppId = (req) => req.appContext?.id ?? null

const uploadDocumentController = async (req, res) => {
  const documentTypeId = req.get('x-document-type-id') || undefined
  const document = await service.uploadDocument({
    appId: getAppId(req),
    userId: req.user.id,
    fileName: req.get('x-file-name'),
    mimeType: req.get('content-type'),
    buffer: req.body,
    documentTypeId,
  })
  return successResponse(res, 'Document uploaded successfully.', normalize(document), 201)
}

const listDocumentsController = async (req, res) =>
  successResponse(res, 'Documents retrieved successfully.', (await service.listMyDocuments({ userId: req.user.id, appId: getAppId(req) })).map(normalize))

const getDocumentController = async (req, res) =>
  successResponse(res, 'Document retrieved successfully.', normalize(await service.getOwnedDocument({ userId: req.user.id, id: req.validated.params.id, appId: getAppId(req) })))

const downloadDocumentController = async (req, res) => {
  const { document, buffer } = await service.readDocument({ userId: req.user.id, id: req.validated.params.id, appId: getAppId(req) })
  res.setHeader('Content-Type', document.mimeType)
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Content-Disposition', `attachment; filename=\"${document.originalName.replace(/\"/g, '')}\"`)
  return res.send(buffer)
}

const deleteDocumentController = async (req, res) => {
  await service.deleteDocument({ userId: req.user.id, id: req.validated.params.id, appId: getAppId(req) })
  return successResponse(res, 'Document deleted successfully.', null)
}

export {
  uploadDocumentController,
  listDocumentsController,
  getDocumentController,
  downloadDocumentController,
  deleteDocumentController,
}
