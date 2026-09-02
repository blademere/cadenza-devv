import { z } from 'zod'

const documentIdValidator = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

const documentTypeIdValidator = z.string().uuid()

const documentUploadValidator = async (req) => {
  const contentType = String(req.headers['content-type'] || '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase()
  const filename = String(req.headers['x-filename'] || '').trim()

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

  if (!filename || filename.length > 255 || /[\0\r\n]/.test(filename)) {
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
    const error = new Error(
      'Document filename extension does not match content type'
    )
    error.statusCode = 400
    throw error
  }

  return { body: req.body }
}

export default {
  documentIdValidator,
  documentTypeIdValidator,
  documentUploadValidator,
}
