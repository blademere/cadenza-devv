import crypto from 'crypto'
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../common/errors/appError.js'
import { getStorageService } from '../../platform/storage/storage.registry.js'
import {
  createStorageKey,
  sanitizeFileName,
} from '../../platform/storage/storage.key.js'
import { DEFAULT_MAX_FILE_SIZE_BYTES } from './document.constants.js'
import {
  findDocumentTypeById,
  createDocument,
  findOwnedDocument,
  listOwnedDocuments,
  softDeleteDocument,
} from './document.repository.js'

const getStorage = () => getStorageService()

const uploadDocument = async ({
  userId,
  fileName,
  mimeType,
  buffer,
  documentTypeId,
}) => {
  const storage = getStorage()
  if (!Buffer.isBuffer(buffer) || buffer.length === 0)
    throw new BadRequestError('The uploaded file is empty.')
  if (buffer.length > DEFAULT_MAX_FILE_SIZE_BYTES)
    throw new BadRequestError('The uploaded file exceeds the 25 MB limit.')
  let originalName
  try {
    originalName = sanitizeFileName(fileName)
  } catch {
    throw new BadRequestError('A valid X-File-Name header is required.')
  }
  const checksumSha256 = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex')
  const storageKey = createStorageKey(originalName)
  if (documentTypeId && !(await findDocumentTypeById(documentTypeId)))
    throw new NotFoundError('Document type not found.')
  await storage.put({
    key: storageKey,
    body: buffer,
    contentType: mimeType || 'application/octet-stream',
  })
  try {
    return await createDocument({
      documentTypeId: documentTypeId || null,
      ownerId: userId,
      originalName,
      storageKey,
      storageProvider: storage.provider,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: BigInt(buffer.length),
      checksumSha256,
    })
  } catch (error) {
    await storage.delete({ key: storageKey }).catch(() => undefined)
    throw error
  }
}
const listMyDocuments = ({ userId }) => listOwnedDocuments({ userId })
const getOwnedDocument = async ({ userId, id }) => {
  const document = await findOwnedDocument({ userId, id })
  if (!document) throw new NotFoundError('Document not found.')
  return document
}
const deleteDocument = async ({ userId, id }) => {
  const storage = getStorage()
  const document = await getOwnedDocument({ userId, id })
  const deleted = await softDeleteDocument(id)
  if (deleted.count !== 1)
    throw new ConflictError('Document was already deleted.')
  await storage.delete({ key: document.storageKey }).catch(() => undefined)
  return { ...document, deletedAt: new Date() }
}
const readDocument = async ({ userId, id }) => {
  const storage = getStorage()
  const document = await getOwnedDocument({ userId, id })
  const { body } = await storage.get({ key: document.storageKey })
  return { document, buffer: body }
}
export {
  uploadDocument,
  listMyDocuments,
  getOwnedDocument,
  deleteDocument,
  readDocument,
}
