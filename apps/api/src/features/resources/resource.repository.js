import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const withTransaction = (callback) => prisma.$transaction(callback)

const findResource = (id, appId, db = prisma) =>
  db.resource.findFirst({
    where: { id, appId },
  })

const findResourceByKey = (key, appId, db = prisma) =>
  db.resource.findFirst({
    where: { key, appId },
  })

const listResources = ({ appId, status, type } = {}, db = prisma) =>
  db.resource.findMany({
    where: {
      appId,
      ...(status === undefined ? {} : { status }),
      ...(type ? { type } : {}),
    },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  })

const createResource = (data, db = prisma) =>
  db.resource.create({ data })

const updateResource = ({ id, appId, data }, db = prisma) =>
  db.resource.updateMany({
    where: { id, appId },
    data,
  })

const activateResource = (id, appId, db = prisma) =>
  db.resource.updateMany({
    where: { id, appId },
    data: { status: 'ACTIVE' },
  })

const deactivateResource = (id, appId, db = prisma) =>
  db.resource.updateMany({
    where: { id, appId },
    data: { status: 'INACTIVE' },
  })

export {
  withTransaction,
  findResource,
  findResourceByKey,
  listResources,
  createResource,
  updateResource,
  activateResource,
  deactivateResource,
  findOverlappingBookings,
  findRoomLessonOverlap,
  isResourceAvailable,
}
