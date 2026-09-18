import { successResponse } from '../../../common/responses/apiResponse.js'
import { getApplicationId } from '../../../platform/applications/application-context.middleware.js'
import * as service from './document.service.js'
import { mapDocument } from '../../../features/documents/document.mapper.js'

const uploadDocument = async (req, res) => {
  const documentTypeId = req.get('x-document-type-id') || undefined
  const document = await service.uploadDocument({
    appId: getApplicationId(req),
    userId: req.user.id,
    fileName: req.get('x-file-name') || req.get('x-filename'),
    mimeType: req.get('content-type'),
    buffer: req.body,
    documentTypeId,
  })
  return successResponse(res, 'Document uploaded successfully.', mapDocument(document), 201)
}

const listDocuments = async (req, res) =>
  successResponse(
    res,
    'Documents retrieved successfully.',
    (await service.listMyDocuments({
      userId: req.user.id,
      appId: getApplicationId(req),
    })).map(mapDocument)
  )

const getDocument = async (req, res) =>
  successResponse(
    res,
    'Document retrieved successfully.',
    mapDocument(await service.getOwnedDocument({
      userId: req.user.id,
      id: req.validated.params.id,
      appId: getApplicationId(req),
    }))
  )

const downloadDocument = async (req, res) => {
  const { document, buffer } = await service.readDocument({
    userId: req.user.id,
    id: req.validated.params.id,
    appId: getApplicationId(req),
  })
  res.setHeader('Content-Type', document.mimeType)
  res.setHeader('Content-Length', buffer.length)
  res.setHeader('Content-Disposition', `attachment; filename="${document.originalName.replace(/"/g, '')}"`)
  return res.send(buffer)
}

const deleteDocument = async (req, res) => {
  await service.deleteDocument({
    userId: req.user.id,
    id: req.validated.params.id,
    appId: getApplicationId(req),
  })
  return successResponse(res, 'Document deleted successfully.', null)
}

const listApplicationDocuments = async (req, res) =>
  successResponse(
    res,
    'Application document checklist retrieved successfully.',
    await service.getChecklist({
      applicationId: req.validated.params.id,
      appId: getApplicationId(req),
    })
  )

const updateApplicationDocument = async (req, res) =>
  successResponse(
    res,
    'Application document receipt updated successfully.',
    await service.updateReceiptStatus({
      applicationId: req.validated.params.id,
      appId: getApplicationId(req),
      requirementId: req.validated.params.requirementId,
      actorId: req.user.id,
      ...req.validated.body,
    })
  )

export {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
  listApplicationDocuments,
  updateApplicationDocument,
}
