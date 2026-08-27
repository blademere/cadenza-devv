const crypto = require('crypto')
const { UnauthorizedError } = require('../../common/errors/appError')
const { env } = require('../../config')
const { publish } = require('../../platform/event-bus/event-bus')
const {
  findUserById,
  createEmailVerificationToken,
  findEmailVerificationToken,
  invalidateEmailVerificationTokens,
  consumeEmailVerificationToken,
} = require('./auth.repository')

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const createVerificationSecret = () => crypto.randomBytes(32).toString('base64url')
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')
const getExpiration = () => new Date(Date.now() + VERIFICATION_TTL_MS)

const issueEmailVerification = async ({ userId, reason = 'registration' }) => {
  const user = await findUserById(userId)
  if (!user || !user.isActive) return { success: true }
  if (user.emailVerifiedAt) return { success: true, alreadyVerified: true }

  await invalidateEmailVerificationTokens(user.id)
  const secret = createVerificationSecret()
  const expiresAt = getExpiration()
  await createEmailVerificationToken({ token: secret, userId: user.id, expiresAt })
  const url = `${env.EMAIL_VERIFICATION_URL}${encodeURIComponent(secret)}`

  await publish({
    event: 'auth.user.email_verification_requested',
    entityType: 'User',
    entityId: user.id,
    context: {
      user: { id: user.id, email: user.email },
      emailVerification: { url, expiresAt: expiresAt.toISOString(), reason },
    },
    idempotencyKey: `auth.email-verification.requested:${user.id}:${hashToken(secret)}`,
  })

  return { success: true, expiresAt }
}

const verifyEmail = async ({ token }) => {
  let stored
  try {
    stored = await findEmailVerificationToken(token)
  } catch {
    throw new UnauthorizedError('Email verification token is invalid or expired.')
  }

  if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user?.isActive) {
    throw new UnauthorizedError('Email verification token is invalid or expired.')
  }

  const result = await consumeEmailVerificationToken({ tokenId: stored.id, userId: stored.userId })
  if (!result.success) throw new UnauthorizedError('Email verification token is invalid or expired.')

  await publish({
    event: 'auth.user.email_verified',
    entityType: 'User',
    entityId: stored.userId,
    actorId: stored.userId,
    context: { user: { id: stored.userId, email: stored.user.email } },
    idempotencyKey: `auth.email-verification.completed:${stored.id}`,
  })

  return { success: true }
}

module.exports = { issueEmailVerification, verifyEmail, VERIFICATION_TTL_MS }
