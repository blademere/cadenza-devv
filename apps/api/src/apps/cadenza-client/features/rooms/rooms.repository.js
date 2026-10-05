import { getPrismaClient } from '../../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const withTransaction = (callback) =>
  prisma.$transaction(callback)

const hydrate = async (room, db = prisma) => {
  if (!room) return room

  const resource = await db.resource.findFirst({
    where: {
      id: room.resourceId,
      appId: room.appId,
    },
  })

  return {
    ...room,
    resource,
    roomName: resource?.name || room.roomType,
    courseIds: room.courseMappings?.map((mapping) => mapping.courseId) ?? [],
    courses: room.courseMappings?.map((mapping) => mapping.course) ?? [],
  }
}

const list = async (appId, db = prisma) => {
  const rooms = await db.cadenzaRoom.findMany({
    where: { appId },
    include: {
      courseMappings: {
        include: { course: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return Promise.all(
    rooms.map((room) => hydrate(room, db))
  )
}

const findById = async (id, appId, db = prisma) =>
  hydrate(
    await db.cadenzaRoom.findFirst({
      where: {
        id,
        appId,
      },
      include: {
        courseMappings: {
          include: { course: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    db
  )

const create = (data, db = prisma) =>
  db.cadenzaRoom.create({
    data,
  })

const createRoomCourses = (data, db = prisma) =>
  db.cadenzaRoomCourse.createMany({ data })

const deleteRoomCourses = (roomId, db = prisma) =>
  db.cadenzaRoomCourse.deleteMany({ where: { roomId } })

const findCourses = (appId, ids, db = prisma) =>
  db.cadenzaCourse.findMany({
    where: { appId, id: { in: ids } },
    select: { id: true },
  })

const createResource = (data, db = prisma) =>
  db.resource.create({
    data,
  })

const findRoomResourceByName = (appId, name, excludeId, db = prisma) =>
  db.resource.findFirst({
    where: {
      appId,
      type: 'CADENZA_ROOM',
      name: {
        equals: name,
        mode: 'insensitive',
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

const update = (id, appId, data, db = prisma) =>
  db.cadenzaRoom.updateMany({
    where: {
      id,
      appId,
    },
    data,
  })

const updateResource = (id, appId, data, db = prisma) =>
  db.resource.updateMany({
    where: { id, appId },
    data,
  })

export {
  withTransaction,
  createResource,
  findRoomResourceByName,
  create,
  list,
  findById,
  update,
  createRoomCourses,
  deleteRoomCourses,
  findCourses,
  updateResource,
}