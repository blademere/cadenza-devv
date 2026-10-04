import { BadRequestError } from '../../common/errors/appError.js'
import { NOTIFICATION_CHANNEL_LIST } from './notification.constants.js'

const RECIPIENT_TYPES = Object.freeze(['STATIC', 'FIELD', 'USER', 'ROLE', 'PERMISSION'])

const parsePermission = (key) => {
  const index = key?.indexOf('.')

  if (!key || index <= 0 || index === key.length - 1) {
    throw new BadRequestError(`Invalid permission key '${key}'.`)
  }

  return {
    resource: key.slice(0, index),
    action: key.slice(index + 1),
  }
}

const normalizeChannel = (channel) => {
  const value = String(channel || '').trim().toUpperCase()

  if (!NOTIFICATION_CHANNEL_LIST.includes(value)) {
    throw new BadRequestError(`Unsupported notification channel '${channel}'.`)
  }

  return value
}

const validateTemplateChannel = ({ channel, subject, body }) => {
  const normalized = normalizeChannel(channel)

  if (!String(body || '').trim()) {
    throw new BadRequestError('Notification template body is required.')
  }

  if (normalized === 'EMAIL' && !String(subject || '').trim()) {
    throw new BadRequestError('Email notification templates require a subject.')
  }

  return normalized
}

const validateRecipientType = (recipientType) => {
  if (!RECIPIENT_TYPES.includes(recipientType)) {
    throw new BadRequestError(`Unsupported notification recipient type '${recipientType}'.`)
  }

  return recipientType
}

const validateRecipientValue = (recipientType, recipientValue) => {
  if (['STATIC', 'FIELD', 'ROLE', 'PERMISSION'].includes(recipientType) && !recipientValue) {
    throw new BadRequestError(`Recipient value is required for '${recipientType}'.`)
  }
}

const validatePriority = (priority) => {
  if (!Number.isInteger(priority) || priority < 0) {
    throw new BadRequestError('Notification priority must be a non-negative integer.')
  }
}

export {
  RECIPIENT_TYPES,
  parsePermission,
  normalizeChannel,
  validateTemplateChannel,
  validateRecipientType,
  validateRecipientValue,
  validatePriority,
}
