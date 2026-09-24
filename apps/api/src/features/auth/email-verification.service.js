import crypto from 'node:crypto'
import { UnauthorizedError } from '../../common/errors/appError.js'
import { env } from '../../config/index.js'
import { publish } from '../../platform/event-bus/event-bus.js'
import { findUserById, createEmailVerificationToken, findEmailVerificationToken, invalidateEmailVerificationTokens, consumeEmailVerificationToken } from './auth.repository.js'
import { hashToken } from './auth.tokens.js'

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const createVerificationSecret = () => crypto.randomBytes(32).toString('base64url')
const verificationKey = () => crypto.createHash('sha256').update(env.JWT_REFRESH_SECRET).digest()
const encryptVerificationSecret = (secret) => { const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', verificationKey(), iv); const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]); return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}` }
const decryptVerificationSecret = (value) => { try { const [iv, tag, ciphertext] = String(value).split('.').map((part) => Buffer.from(part, 'base64url')); if (!iv || !tag || !ciphertext || iv.length !== 12 || tag.length !== 16) throw new Error('invalid token'); const decipher = crypto.createDecipheriv('aes-256-gcm', verificationKey(), iv); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8') } catch { throw new UnauthorizedError('Email verification token is invalid or expired.') } }
const getExpiration = () => new Date(Date.now() + VERIFICATION_TTL_MS)
const issueEmailVerification = async ({ userId, reason = 'registration' }) => {
  const user = await findUserById(userId)
  if (!user || !user.isActive) return { success: true }
  if (user.emailVerifiedAt) return { success: true, alreadyVerified: true }
  await invalidateEmailVerificationTokens(user.id)
  const secret = createVerificationSecret()
  const expiresAt = getExpiration()
  const record = await createEmailVerificationToken({ tokenHash: hashToken(secret), userId: user.id, expiresAt })
  const encryptedToken = encryptVerificationSecret(secret)
  const url = `${env.EMAIL_VERIFICATION_URL}${encodeURIComponent(encryptedToken)}`
  await publish({ event: 'auth.user.email_verification_requested', entityType: 'User', entityId: user.id, context: { user: { id: user.id, email: user.email }, emailVerification: { url, expiresAt: expiresAt.toISOString(), reason } }, idempotencyKey: `auth.email-verification.requested:${record.id}` })
  return { success: true, expiresAt }
}
const verifyEmail = async ({ token }) => {
  const plaintextToken = decryptVerificationSecret(token)
  const stored = await findEmailVerificationToken(hashToken(plaintextToken))
  if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user?.isActive) throw new UnauthorizedError('Email verification token is invalid or expired.')
  const result = await consumeEmailVerificationToken({ tokenId: stored.id, userId: stored.userId })
  if (!result.success) throw new UnauthorizedError('Email verification token is invalid or expired.')
  await publish({ event: 'auth.user.email_verified', entityType: 'User', entityId: stored.userId, actorId: stored.userId, context: { user: { id: stored.userId, email: stored.user.email } }, idempotencyKey: `auth.email-verification.completed:${stored.id}` })
  return { success: true }
}

export { issueEmailVerification, verifyEmail, VERIFICATION_TTL_MS, hashToken, encryptVerificationSecret, decryptVerificationSecret }
