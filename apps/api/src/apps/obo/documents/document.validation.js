import { z } from 'zod'

const uuid = z.string().uuid()

const documentIdValidator = {
  params: z.object({
    id: uuid,
  }),
}

const documentTypeIdValidator = uuid

const documentUploadValidator = async (req) => {
  const contentType = String(req.headers['content-type'] || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  const filename = String(req.headers['x-filename'] || req.headers['x-file-name'] || '').trim()

  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
  ])

  if (!allowedMimeTypes.has(contentType)) {
    const error = new Error('Unsupported document content type')
    error.statusCode = 400
    throw error
  }

  if (!filename || filename.length > 255 || /[\u0000\r\n]/.test(filename)) {
    const error = new Error('Invalid document filename')
    error.statusCode = 400
    throw error
  }

  const extension = filename.includes('.')
    ? filename.slice(filename.lastIndexOf('.')).toLowerCase()
    : ''
  const allowedExtensions = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
    'text/plain': ['.txt'],
  }

  if (!allowedExtensions[contentType].includes(extension)) {
    const error = new Error('Document filename extension does not match content type')
    error.statusCode = 400
    throw error
  }

  return { body: req.body }
}

const applicationDocumentsParamsValidator = async (req) => ({
  params: z.object({ id: uuid }).parse(req.params),
})

const updateDocumentReceiptValidator = async (req) => ({
  params: z.object({ id: uuid, requirementId: uuid }).parse(req.params),
  body: z.object({
    status: z.enum(['RECEIVED', 'VERIFIED', 'REJECTED']),
    documentId: uuid.nullable().optional(),
    notes: z.string().trim().max(2000).optional(),
  }).parse(req.body || {}),
})

export {
  documentIdValidator,
  documentTypeIdValidator,
  documentUploadValidator,
  applicationDocumentsParamsValidator,
  updateDocumentReceiptValidator,
}
