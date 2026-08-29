import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = require('../../../../src/features/auth/auth.repository.js')
const bcrypt = require('bcrypt')
const eventBus = require('../../../../src/platform/event-bus/event-bus')

vi.spyOn(eventBus, 'publish').mockResolvedValue({ id: 'event-1' })
vi.spyOn(repository, 'findUserById')
vi.spyOn(repository, 'changePassword')
vi.spyOn(repository, 'listActiveSessions')
vi.spyOn(repository, 'revokeSession')
vi.spyOn(repository, 'bumpUserAuthVersion')
vi.spyOn(bcrypt, 'compare')
vi.spyOn(bcrypt, 'hash')

const { changePassword, getSessions, revokeSessionById, revokeAllSessions } = require('../../../../src/features/auth/auth.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
})

describe('auth security lifecycle', () => {
  it('changes password only after verifying the current password', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.compare.mockResolvedValue(true)
    bcrypt.hash.mockResolvedValue('new-hash')
    repository.changePassword.mockResolvedValue({ id: 7, authVersion: 3 })

    await expect(changePassword({ userId: 7, currentPassword: 'old-password', newPassword: 'new-password' })).resolves.toEqual({ success: true })
    expect(bcrypt.compare).toHaveBeenCalledWith('old-password', 'old-hash')
    expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 12)
    expect(repository.changePassword).toHaveBeenCalledWith({ userId: 7, passwordHash: 'new-hash' })
  })

  it('rejects an incorrect current password without changing credentials', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.compare.mockResolvedValue(false)

    await expect(changePassword({ userId: 7, currentPassword: 'wrong-password', newPassword: 'new-password' })).rejects.toThrow('Current password is incorrect.')
    expect(bcrypt.hash).not.toHaveBeenCalled()
    expect(repository.changePassword).not.toHaveBeenCalled()
  })

  it('invalidates all refresh sessions when changing password', async () => {
    repository.findUserById.mockResolvedValue({ id: 7, isActive: true, passwordHash: 'old-hash' })
    bcrypt.compare.mockResolvedValue(true)
    bcrypt.hash.mockResolvedValue('new-hash')
    repository.changePassword.mockResolvedValue({ id: 7, authVersion: 3 })

    await changePassword({ userId: 7, currentPassword: 'old-password', newPassword: 'new-password' })

    expect(repository.changePassword).toHaveBeenCalledWith({ userId: 7, passwordHash: 'new-hash' })
  })

  it('lists only the authenticated user sessions', async () => {
    repository.listActiveSessions.mockResolvedValue([{ id: 'session-1', createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) }])

    await expect(getSessions({ userId: 7 })).resolves.toHaveLength(1)
    expect(repository.listActiveSessions).toHaveBeenCalledWith(7)
  })

  it('cannot revoke a session belonging to another user', async () => {
    repository.revokeSession.mockResolvedValue({ count: 0 })

    await expect(revokeSessionById({ userId: 7, sessionId: 'session-2' })).rejects.toThrow('Session not found or already revoked.')
    expect(repository.revokeSession).toHaveBeenCalledWith({ userId: 7, sessionId: 'session-2' })
  })

  it('revokes all sessions through authVersion invalidation', async () => {
    repository.bumpUserAuthVersion.mockResolvedValue({ id: 7, authVersion: 4 })

    await expect(revokeAllSessions({ userId: 7 })).resolves.toEqual({ success: true })
    expect(repository.bumpUserAuthVersion).toHaveBeenCalledWith(7)
  })
})
