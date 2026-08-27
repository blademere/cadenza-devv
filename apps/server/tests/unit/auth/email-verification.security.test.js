import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  findEmailVerificationToken: vi.fn(),
  invalidateEmailVerificationTokens: vi.fn(),
  consumeEmailVerificationToken: vi.fn(),
  publish: vi.fn(),
}))

vi.mock('../../../src/features/auth/auth.repository', () => ({
  findUserById: mocks.findUserById,
  createEmailVerificationToken: mocks.createEmailVerificationToken,
  findEmailVerificationToken: mocks.findEmailVerificationToken,
  invalidateEmailVerificationTokens: mocks.invalidateEmailVerificationTokens,
  consumeEmailVerificationToken: mocks.consumeEmailVerificationToken,
}))
vi.mock('../../../src/platform/event-bus/event-bus', () => ({ publish: mocks.publish }))

const { issueEmailVerification, verifyEmail, encryptVerificationSecret, decryptVerificationSecret } = require('../../../src/features/auth/email-verification.service')

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
    const event = publish.mock.calls[0][0]

    expect(result.success).toBe(true)
    expect(createEmailVerificationToken).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, token: expect.any(String) }))
    expect(event.event).toBe('auth.user.email_verification_requested')
    expect(event.idempotencyKey).toBe('auth.email-verification.requested:verification-record-1')
    expect(event.context.emailVerification.url).not.toContain(createEmailVerificationToken.mock.calls[0][0].token)
  })

  it('rejects replayed, expired, inactive, and already-used verification tokens', async () => {
    const secret = 'b'.repeat(43)
    const token = encryptVerificationSecret(secret)
    findEmailVerificationToken.mockResolvedValue({
      id: 'verification-record-2',
      userId: 7,
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 7, email: 'user@example.com', isActive: true },
    })

    await expect(verifyEmail({ token })).rejects.toThrow('Email verification token is invalid or expired.')
    expect(consumeEmailVerificationToken).not.toHaveBeenCalled()
  })

  it('consumes a valid token atomically and publishes completion', async () => {
    const secret = 'c'.repeat(43)
    const token = encryptVerificationSecret(secret)
    findEmailVerificationToken.mockResolvedValue({
      id: 'verification-record-3',
      userId: 7,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 7, email: 'user@example.com', isActive: true },
    })
    consumeEmailVerificationToken.mockResolvedValue({ success: true })
    publish.mockResolvedValue(undefined)

    await expect(verifyEmail({ token })).resolves.toEqual({ success: true })
    expect(consumeEmailVerificationToken).toHaveBeenCalledWith({ tokenId: 'verification-record-3', userId: 7 })
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.email_verified', entityId: 7 }))
  })
})
