import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const getNotificationForUser = (id, userId, db = prisma) =>
  db.notification.findFirst({
    where: { id: Number(id), userId: Number(userId) },
  })

const listNotifications = (
  { userId, unreadOnly = false, page = 1, limit = 20 },
  db = prisma
) => {
  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) }
  return Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.notification.count({ where }),
  ])
}

const markNotificationRead = (userId, id, db = prisma) =>
  db.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  })

const findNotificationById = (id, db = prisma) =>
  db.notification.findUnique({ where: { id } })

const upsertNotificationPreference = (
  { userId, channel, destination, enabled },
  db = prisma
) =>
  db.notificationPreference.upsert({
    where: { userId_channel: { userId, channel } },
    update: { destination, enabled },
    create: { userId, channel, destination, enabled },
  })

const listNotificationPreferences = (userId, db = prisma) =>
  db.notificationPreference.findMany({
    where: { userId },
    orderBy: { channel: 'asc' },
  })

export {
  getNotificationForUser,
  listNotifications,
  markNotificationRead,
  findNotificationById,
  upsertNotificationPreference,
  listNotificationPreferences,
}
