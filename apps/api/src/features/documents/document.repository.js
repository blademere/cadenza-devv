import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const findDocumentTypeById = (id, db = prisma) =>
  db.documentType.findUnique({ where: { id } })
const createDocument = (data, db = prisma) => db.document.create({ data })

const buildOwnershipWhere = ({ id, userId, appId }) => ({
  id,
  ownerId: userId,
  deletedAt: null,
  ...(appId ? { OR: [{ appId }, { appId: null }] } : {}),
})

const findOwnedDocument = ({ userId, id, appId = null }, db = prisma) =>
  db.document.findFirst({
    where: buildOwnershipWhere({ userId, id, appId }),
  })

const listOwnedDocuments = ({ userId, appId = null }, db = prisma) =>
  db.document.findMany({
    where: {
      ownerId: userId,
      deletedAt: null,
      ...(appId ? { OR: [{ appId }, { appId: null }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      appId: true,
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

const softDeleteDocument = ({ id, userId, appId = null }, db = prisma) =>
  db.document.updateMany({
    where: buildOwnershipWhere({ id, userId, appId }),
    data: { deletedAt: new Date() },
  })

export {
  findDocumentTypeById,
  createDocument,
  findOwnedDocument,
  listOwnedDocuments,
  softDeleteDocument,
}
