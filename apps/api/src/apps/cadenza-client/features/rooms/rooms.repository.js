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
  }
}

const list = async (appId, db = prisma) => {
  const rooms = await db.cadenzaRoom.findMany({
    where: { appId },
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
    }),
    db
  )

const create = (data, db = prisma) =>
  db.cadenzaRoom.create({
    data,
  })

const createResource = (data, db = prisma) =>
  db.resource.create({
    data,
  })

const update = (id, appId, data, db = prisma) =>
  db.cadenzaRoom.updateMany({
    where: {
      id,
      appId,
    },
    data,
  })

export {
  withTransaction,
  createResource,
  create,
  list,
  findById,
  update,
}