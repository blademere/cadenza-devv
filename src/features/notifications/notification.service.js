const { getPrismaClient } = require('../../infrastructure/database/prisma')
const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const { sendNotification: sendPlatformNotification } = require('../../platform/notifications/notification.send.service')
const { NOTIFICATION_CHANNEL_LIST, NOTIFICATION_CHANNELS } = require('./notification.constants')

const prisma = getPrismaClient()

const normalizeChannels = (channels) => {
  const values = channels?.length ? channels : [NOTIFICATION_CHANNELS.IN_APP]
  const normalized = [...new Set(values.map((channel) => String(channel).trim().toUpperCase()))]
  const invalid = normalized.filter((channel) => !NOTIFICATION_CHANNEL_LIST.includes(channel))
  if (invalid.length) throw new BadRequestError(`Unsupported notification channel '${invalid[0]}'.`)
  return normalized
}

const getNotificationForUser = async ({ id, userId }) =>
  prisma.notification.findFirst({ where: { id: Number(id), userId: Number(userId) } })

const sendNotification = async ({ userId, type, title, message, data = null, channels }) =>
  sendPlatformNotification({
    userId,
    type,
    title,
    message,
    data,
    channels: channels?.length ? normalizeChannels(channels) : undefined,
  })

const listNotifications = async ({ userId, unreadOnly = false, page = 1, limit = 20 }) => {
  const where = { userId, ...(unreadOnly ? { readAt: null } : {}) }
  const [data, total] = await prisma.$transaction([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }),
  ])
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

const markNotificationRead = async ({ userId, id }) => {
  const result = await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } })
  if (result.count !== 1) throw new NotFoundError('Notification not found.')
  return prisma.notification.findUnique({ where: { id } })
}

const setNotificationPreference = async ({ userId, channel, destination = null, enabled = true }) => {
  const normalizedChannel = String(channel || '').trim().toUpperCase()
  if (!NOTIFICATION_CHANNEL_LIST.includes(normalizedChannel)) throw new BadRequestError(`Unsupported notification channel '${channel}'.`)
  if (normalizedChannel === NOTIFICATION_CHANNELS.IN_APP && destination) throw new BadRequestError('IN_APP notifications do not accept a destination.')
  if (normalizedChannel !== NOTIFICATION_CHANNELS.IN_APP && enabled && !destination) throw new BadRequestError(`A destination is required for '${normalizedChannel}'.`)
  return prisma.notificationPreference.upsert({
    where: { userId_channel: { userId, channel: normalizedChannel } },
    update: { destination, enabled },
    create: { userId, channel: normalizedChannel, destination, enabled },
  })
}

const listNotificationPreferences = async ({ userId }) =>
  prisma.notificationPreference.findMany({ where: { userId }, orderBy: { channel: 'asc' } })

module.exports = {
  getNotificationForUser,
  sendNotification,
  listNotifications,
  markNotificationRead,
  setNotificationPreference,
  listNotificationPreferences,
  normalizeChannels,
}
