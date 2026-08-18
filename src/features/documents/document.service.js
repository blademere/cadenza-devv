const crypto = require("crypto")
const { getPrismaClient } = require("../../infrastructure/database/prisma")
const { NotFoundError, BadRequestError } = require("../../common/errors/appError")
const storage = require("../../infrastructure/storage/local")
const { DEFAULT_MAX_FILE_SIZE_BYTES } = require("./document.constants")

const prisma = getPrismaClient()

const sanitizeFileName = (value) => {
  const name = String(value || "").trim()
  if (!name || name.length > 255) {
    throw new BadRequestError("A valid X-File-Name header is required.")
  }
  return name.replace(/[\\/\0]/g, "_")
}

const uploadDocument = async ({ userId, fileName, mimeType, buffer, documentTypeId }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new BadRequestError("The uploaded file is empty.")
  }
  if (buffer.length > DEFAULT_MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError("The uploaded file exceeds the 25 MB limit.")
  }

  const originalName = sanitizeFileName(fileName)
  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex")
  const storageKey = storage.createStorageKey(originalName)

  if (documentTypeId) {
    const documentType = await prisma.documentType.findUnique({ where: { id: documentTypeId } })
    if (!documentType) throw new NotFoundError("Document type not found.")
  }

  await storage.putObject({ key: storageKey, buffer })

  try {
    return await prisma.document.create({
      data: {
        documentTypeId: documentTypeId || null,
        ownerId: userId,
        originalName,
        storageKey,
        storageProvider: "local",
        mimeType: mimeType || "application/octet-stream",
        sizeBytes: BigInt(buffer.length),
        checksumSha256,
      },
    })
  } catch (error) {
    await storage.deleteObject(storageKey).catch(() => undefined)
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
  await storage.deleteObject(document.storageKey)
  return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } })
}

const readDocument = async ({ userId, id }) => {
  const document = await getOwnedDocument({ userId, id })
  const buffer = await storage.getObject(document.storageKey)
  return { document, buffer }
}

module.exports = {
  uploadDocument,
  listMyDocuments,
  getOwnedDocument,
  deleteDocument,
  readDocument,
}
