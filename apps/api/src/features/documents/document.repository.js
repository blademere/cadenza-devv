import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const findDocumentTypeById = (id, db = prisma) =>
  db.documentType.findUnique({ where: { id } })
const createDocument = (data, db = prisma) => db.document.create({ data })
const findOwnedDocument = ({ userId, id }, db = prisma) =>
  db.document.findFirst({ where: { id, ownerId: userId, deletedAt: null } })
const listOwnedDocuments = ({ userId }, db = prisma) =>
  db.document.findMany({
    where: { ownerId: userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
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
const softDeleteDocument = (id, db = prisma) =>
  db.document.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  })

export {
  findDocumentTypeById,
  createDocument,
  findOwnedDocument,
  listOwnedDocuments,
  softDeleteDocument,
}
