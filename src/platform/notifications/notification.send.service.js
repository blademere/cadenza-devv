const crypto = require('node:crypto')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const { NOTIFICATION_CHANNEL_LIST, NOTIFICATION_CHANNELS } = require('./notification.constants')

const prisma = getPrismaClient()

const normalizeChannels = (channels) => {
  const values = channels?.length ? channels : [NOTIFICATION_CHANNELS.IN_APP]
  const normalized = [...new Set(values.map((channel) => String(channel).trim().toUpperCase()))]
  const invalid = normalized.filter((channel) => !NOTIFICATION_CHANNEL_LIST.includes(channel))
  if (invalid.length) {
    throw new BadRequestError(`Unsupported notification channel '${invalid[0]}'.`)
  }
  return normalized
}

const deliveryIdempotencyKey = ({ notificationId, channel, recipient }) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify([notificationId, channel, recipient]))
    .digest('hex')

const sendNotification = async ({ userId, type, title, message, data = null, channels }) => {
  if (!userId || !type || !title || !message) {
    throw new BadRequestError('userId, type, title, and message are required.')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true, notificationPreferences: true },
  })
  if (!user || !user.isActive) {
    throw new NotFoundError('Notification recipient not found.')
  }

  const preferences = new Map(
    user.notificationPreferences
      .filter((preference) => preference.enabled)
      .map((preference) => [preference.channel, preference])
  )
  const requestedChannels = channels?.length
    ? normalizeChannels(channels)
    : normalizeChannels([NOTIFICATION_CHANNELS.IN_APP, ...preferences.keys()])

  const notification = await prisma.notification.create({
    data: { userId, type, title, message, data },
  })

  const deliveries = []
  for (const channel of requestedChannels) {
    if (channel === NOTIFICATION_CHANNELS.IN_APP) continue

    const preference = preferences.get(channel)
    const recipient = preference?.destination || (channel === NOTIFICATION_CHANNELS.EMAIL ? user.email : null)
    if (!recipient) continue

    const delivery = await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        recipient,
        channel,
        status: 'QUEUED',
        idempotencyKey: deliveryIdempotencyKey({ notificationId: notification.id, channel, recipient }),
        payload: { notificationId: notification.id, type, title, message, data },
      },
    })
    deliveries.push(delivery)
  }

  return { notification, deliveries }
}

module.exports = {
  sendNotification,
  normalizeChannels,
}
