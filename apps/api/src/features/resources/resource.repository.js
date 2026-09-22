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

const findOverlappingBookings = ({ appId, resourceId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaRental.findFirst({ where: { appId, resourceId, status: { in: ['PENDING', 'RESERVED', 'CHECKED_OUT'] }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) } })

const findRoomLessonOverlap = ({ appId, roomId, startsAt, endsAt, excludeId }, db = prisma) => db.cadenzaLessonSession.findFirst({ where: { appId, roomId, status: { not: 'CANCELLED' }, scheduledStart: { lt: endsAt }, scheduledEnd: { gt: startsAt }, ...(excludeId ? { id: { not: excludeId } } : {}) } })

const isResourceAvailable = async ({ appId, resourceId, resourceType, startsAt, endsAt, excludeId }, db = prisma) => {
  const resource = await findResource(resourceId, appId, db)
  if (!resource || resource.status !== 'ACTIVE' || resource.type !== resourceType) return false
  if (await findOverlappingBookings({ appId, resourceId, startsAt, endsAt, excludeId }, db)) return false
  if (resourceType === 'CADENZA_ROOM') {
    const room = await db.cadenzaRoom.findFirst({ where: { appId, resourceId } })
    if (room && await findRoomLessonOverlap({ appId, roomId: room.id, startsAt, endsAt, excludeId })) return false
  }
  return true
}

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
