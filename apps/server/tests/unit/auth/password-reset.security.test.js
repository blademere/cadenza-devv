import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/platform/event-bus/event-bus', () => ({ publish: vi.fn().mockResolvedValue({ id: 'event-1' }) }))

const repository = require('../../../src/features/auth/auth.repository.js')
const bcrypt = require('bcrypt')
const eventBus = require('../../../src/platform/event-bus/event-bus')

vi.spyOn(repository, 'findUserByEmail')
vi.spyOn(repository, 'invalidatePasswordResetTokens')
vi.spyOn(repository, 'createPasswordResetToken')
vi.spyOn(repository, 'findPasswordResetToken')
vi.spyOn(repository, 'consumePasswordResetToken')
vi.spyOn(bcrypt, 'hash')

const { requestPasswordReset, resetPassword } = require('../../../src/features/auth/auth.service.js')

beforeEach(() => { vi.clearAllMocks(); bcrypt.hash.mockResolvedValue('new-password-hash') })

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
    const result = await requestPasswordReset({ email: 'user@example.com' })
    const createCall = repository.createPasswordResetToken.mock.calls[0][0]
    const publishCall = eventBus.publish.mock.calls[0][0]
    expect(result.token).toBeTruthy()
    expect(createCall.token).not.toContain('.')
    expect(createCall.token.length).toBeGreaterThanOrEqual(32)
    expect(publishCall.context.passwordReset.url).toContain('token=')
    expect(publishCall.context.passwordReset.url).not.toContain(createCall.token)
  })

  it('rejects malformed reset credentials before touching the repository', async () => {
    await expect(resetPassword({ token: 'not-a-reset-token', newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.findPasswordResetToken).not.toHaveBeenCalled()
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })

  it('consumes the reset token and invalidates authenticated sessions', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    const request = await requestPasswordReset({ email: 'user@example.com' })
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() + 60000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    repository.consumePasswordResetToken.mockResolvedValue({ success: true })
    await expect(resetPassword({ token: request.token, newPassword: 'new-password' })).resolves.toEqual({ success: true })
    expect(repository.consumePasswordResetToken).toHaveBeenCalledWith({ tokenId: 'reset-1', userId: 42, passwordHash: 'new-password-hash' })
    expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth.user.password_reset' }))
  })

  it('rejects an expired reset token', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 42, email: 'user@example.com', isActive: true, passwordHash: 'old-hash' })
    repository.createPasswordResetToken.mockResolvedValue({ id: 'reset-1' })
    const request = await requestPasswordReset({ email: 'user@example.com' })
    repository.findPasswordResetToken.mockResolvedValue({ id: 'reset-1', userId: 42, expiresAt: new Date(Date.now() - 1000), usedAt: null, user: { id: 42, email: 'user@example.com', isActive: true } })
    await expect(resetPassword({ token: request.token, newPassword: 'new-password' })).rejects.toThrow('Password reset token is invalid or expired.')
    expect(repository.consumePasswordResetToken).not.toHaveBeenCalled()
  })
})
