const crypto = require("crypto")
const { getPrismaClient } = require("../../infrastructure/database/prisma")
const { NotFoundError, BadRequestError } = require("../../common/errors/appError")
const storage = require("../../infrastructure/storage")
const env = require("../../config/env")
const { createStorageKey, sanitizeFileName } = require("../../platform/storage/storage.key")
const { DEFAULT_MAX_FILE_SIZE_BYTES } = require("./document.constants")

const prisma = getPrismaClient()

const uploadDocument = async ({ userId, fileName, mimeType, buffer, documentTypeId }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new BadRequestError("The uploaded file is empty.")
  }
  if (buffer.length > DEFAULT_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError("The uploaded file exceeds the 25 MB limit.")
  }

  let originalName
  try {
    originalName = sanitizeFileName(fileName)
  } catch {
    throw new BadRequestError("A valid X-File-Name header is required.")
  }

  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
  const storageKey = createStorageKey(originalName)

  if (documentTypeId) {
    const documentType = await prisma.documentType.findUnique({ where: { id: documentTypeId } })
    if (!documentType) throw new NotFoundError("Document type not found.")
  }

  await storage.put({
    key: storageKey,
    body: buffer,
    contentType: mimeType || "application/octet-stream",
  })

  try {
    return await prisma.document.create({
      data: {
        documentTypeId: documentTypeId || null,
        ownerId: userId,
        originalName,
        storageKey,
        storageProvider: env.STORAGE_PROVIDER,
        mimeType: mimeType || "application/octet-stream",
        sizeBytes: BigInt(buffer.length),
        checksumSha256,
      },
    })
  } catch (error) {
    await storage.delete({ key: storageKey }).catch(() => undefined)
    throw error
  }
}

const listMyDocuments = async ({ userId }) => prisma.document.findMany({
  where: { ownerId: userId, deletedAt: null },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    documentTypeId: true,
    originalName: true,
    storageProvider: true,
    mimeType: true,
    sizeBytes: true,
    checksumSha256: true,
    createdAt: true,
    updatedAt: true,
  },
})

const getOwnedDocument = async ({ userId, id }) => {
  const document = await prisma.document.findFirst({ where: { id, ownerId: userId, deletedAt: null } })
  if (!document) throw new NotFoundError("Document not found.")
  return document
}

const deleteDocument = async ({ userId, id }) => {
  const document = await getOwnedDocument({ userId, id })
  await storage.delete({ key: document.storageKey })
  return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } })
}

const readDocument = async ({ userId, id }) => {
  const document = await getOwnedDocument({ userId, id })
  const { body } = await storage.get({ key: document.storageKey })
  return { document, buffer: body }
}

module.exports = {
  uploadDocument,
  listMyDocuments,
  getOwnedDocument,
  deleteDocument,
  readDocument,
}
