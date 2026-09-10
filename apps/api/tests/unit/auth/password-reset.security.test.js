import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/platform/event-bus/event-bus.js')
vi.mock('../../../src/features/auth/auth.tokens.js')
vi.mock('bcrypt')

const repository = await import('../../../src/features/auth/auth.repository.js')
const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const tokens = await import('../../../src/features/auth/auth.tokens.js')
const bcrypt = await import('bcrypt')
const { requestPasswordReset, resetPassword } = await import('../../../src/features/auth/auth.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
  bcrypt.default.hash.mockResolvedValue('new-password-hash')
  tokens.hashToken.mockImplementation((value) => `hash:${value}`)
})

const getPublishedResetToken = () => {
  const publishCall = eventBus.publish.mock.calls[0]?.[0]
  const url = publishCall?.context?.passwordReset?.url
  return new URL(url).searchParams.get('token')
}

describe('password reset security', () => {
  it('does not enumerate unknown accounts', async () => {
    repository.findUserByEmail.mockResolvedValue(null)
    await expect(requestPasswordReset({ email: 'missing@example.com' })).resolves.toEqual({ success: true })
    expect(repository.createPasswordResetToken).not.toHaveBeenCalled()
    expect(eventBus.publish).not.toHaveBeenCalled()
  })

  it('stores only a hash and publishes an encrypted reset link', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await expect(requestPasswordReset({ email: 'user@example.com' })).resolves.toEqual({ success: true })
    const createCall = repository.createPasswordResetToken.mock.calls[0][0]
    const encryptedToken = getPublishedResetToken()
    const publishCall = eventBus.publish.mock.calls[0][0]
    expect(encryptedToken).toBeTruthy()
    expect(createCall.tokenHash).toBe('hash:' + expect.any(String))
    expect(createCall.token).toBeUndefined()
    expect(publishCall.context.passwordReset.url).toContain('token=')
    expect(publishCall.context.passwordReset.url).not.toContain(createCall.tokenHash)
  })

  it('rejects malformed reset credentials before touching the repository', async () => {
    await expect(resetPassword({ token: 'not-a-reset-token', newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.findPasswordResetToken).not.toHaveBeenCalled()
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })

  it('consumes the reset token and invalidates authenticated sessions', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await requestPasswordReset({ email: 'user@example.com' })
    const token = getPublishedResetToken()
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() + 60000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    repository.consumePasswordResetToken.mockResolvedValue({ success: true })
    await expect(resetPassword({ token, newPassword: 'new-password' })).resolves.toEqual({ success: true })
    expect(repository.consumePasswordResetToken).toHaveBeenCalledWith({ tokenId: 'reset-1', userId: 42, passwordHash: 'new-password-hash' })
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.password_reset' }))
  })

  it('rejects an expired reset token', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    await requestPasswordReset({ email: 'user@example.com' })
    const token = getPublishedResetToken()
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() - 1000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    await expect(resetPassword({ token, newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })
})
