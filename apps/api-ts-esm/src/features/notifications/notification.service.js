const { BadRequestError, NotFoundError } = require('../../common/errors/appError')
const { sendNotification: sendPlatformNotification } = require('../../platform/notifications/notification.send.service')
const { NOTIFICATION_CHANNEL_LIST, NOTIFICATION_CHANNELS } = require('../../platform/notifications/notification.constants')
const repository = require('./notification.repository')

const getNotificationForUser = async ({ id, userId }) => repository.getNotificationForUser(id, userId)

const sendNotification = async ({ userId, type, title, message, data = null, channels }) =>
  sendPlatformNotification({ userId, type, title, message, data, channels })

const listNotifications = async ({ userId, unreadOnly = false, page = 1, limit = 20 }) => {
  const [data, total] = await repository.listNotifications({ userId, unreadOnly, page, limit })
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }
}

const markNotificationRead = async ({ userId, id }) => {
  const result = await repository.markNotificationRead(userId, id)
  if (result.count !== 1) throw new NotFoundError('Notification not found.')
  return repository.findNotificationById(id)
}

const setNotificationPreference = async ({ userId, channel, destination = null, enabled = true }) => {
  const normalizedChannel = String(channel || '').trim().toUpperCase()
  if (!NOTIFICATION_CHANNEL_LIST.includes(normalizedChannel)) throw new BadRequestError(`Unsupported notification channel '${channel}'.`)
  if (normalizedChannel === NOTIFICATION_CHANNELS.IN_APP && destination) throw new BadRequestError('IN_APP notifications do not accept a destination.')
  if (normalizedChannel !== NOTIFICATION_CHANNELS.IN_APP && enabled && !destination) throw new BadRequestError(`A destination is required for '${normalizedChannel}'.`)
  return repository.upsertNotificationPreference({ userId, channel: normalizedChannel, destination, enabled })
}

const listNotificationPreferences = async ({ userId }) => repository.listNotificationPreferences(userId)

module.exports = { getNotificationForUser, sendNotification, listNotifications, markNotificationRead, setNotificationPreference, listNotificationPreferences }
