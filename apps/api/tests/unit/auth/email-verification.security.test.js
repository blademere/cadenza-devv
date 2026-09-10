import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/platform/event-bus/event-bus.js')

const authRepository = await import('../../../src/features/auth/auth.repository.js')
const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const { issueEmailVerification, verifyEmail, encryptVerificationSecret, decryptVerificationSecret } = await import('../../../src/features/auth/email-verification.service.js')

const mocks = {
  findUserById: authRepository.findUserById,
  createEmailVerificationToken: authRepository.createEmailVerificationToken,
  findEmailVerificationToken: authRepository.findEmailVerificationToken,
  invalidateEmailVerificationTokens: authRepository.invalidateEmailVerificationTokens,
  consumeEmailVerificationToken: authRepository.consumeEmailVerificationToken,
  publish: eventBus.publish,
}

describe('email verification security', () => {
  const { findUserById, createEmailVerificationToken, findEmailVerificationToken, invalidateEmailVerificationTokens, consumeEmailVerificationToken, publish } = mocks

  beforeEach(() => vi.clearAllMocks())

  it('encrypts verification credentials and round-trips without exposing plaintext', () => {
    const secret = 'a'.repeat(43)
    const encrypted = encryptVerificationSecret(secret)
    expect(encrypted).not.toContain(secret)
    expect(decryptVerificationSecret(encrypted)).toBe(secret)
  })

  it('issues a hashed-token-backed verification event without exposing the raw secret', async () => {
    findUserById.mockResolvedValue({ id: 7, email: 'user@example.com', isActive: true, emailVerifiedAt: null })
    invalidateEmailVerificationTokens.mockResolvedValue({ count: 0 })
    createEmailVerificationToken.mockResolvedValue({ id: 'verification-record-1' })
    publish.mockResolvedValue(undefined)
    const result = await issueEmailVerification({ userId: 7 })
    expect(publish).toHaveBeenCalledTimes(1)
    const event = publish.mock.calls[0][0]
    const createCall = createEmailVerificationToken.mock.calls[0][0]
    expect(result.success).toBe(true)
    expect(createCall).toEqual(expect.objectContaining({ userId: 7, tokenHash: expect.any(String) }))
    expect(createCall.tokenHash).not.toHaveLength(0)
    expect(event.event).toBe('auth.user.email_verification_requested')
    expect(event.idempotencyKey).toBe('auth.email-verification.requested:verification-record-1')
    expect(event.context.emailVerification.url).not.toContain(createCall.tokenHash)
  })

  it('rejects replayed, expired, inactive, and already-used verification tokens', async () => {
    const token = encryptVerificationSecret('b'.repeat(43))
    findEmailVerificationToken.mockResolvedValue({ id: 'verification-record-2', userId: 7, usedAt: new Date(), expiresAt: new Date(Date.now() + 60000), user: { id: 7, email: 'user@example.com', isActive: true } })
    await expect(verifyEmail({ token })).rejects.toThrow('Email verification token is invalid or expired.')
    expect(consumeEmailVerificationToken).not.toHaveBeenCalled()
  })

  it('consumes a valid token atomically and publishes completion', async () => {
    const token = encryptVerificationSecret('c'.repeat(43))
    findEmailVerificationToken.mockResolvedValue({ id: 'verification-record-3', userId: 7, usedAt: null, expiresAt: new Date(Date.now() + 60000), user: { id: 7, email: 'user@example.com', isActive: true } })
    consumeEmailVerificationToken.mockResolvedValue({ success: true })
    publish.mockResolvedValue(undefined)
    await expect(verifyEmail({ token })).resolves.toEqual({ success: true })
    expect(consumeEmailVerificationToken).toHaveBeenCalledWith({ tokenId: 'verification-record-3', userId: 7 })
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.email_verified', entityId: 7 }))
  })
})
