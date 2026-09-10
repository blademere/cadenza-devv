import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/platform/event-bus/event-bus.js')
vi.mock('../../../src/features/auth/auth.repository.js')
vi.mock('../../../src/features/auth/auth.tokens.js')

const eventBus = await import('../../../src/platform/event-bus/event-bus.js')
const repository = await import('../../../src/features/auth/auth.repository.js')
const tokens = await import('../../../src/features/auth/auth.tokens.js')
const { UnauthorizedError } = await import('../../../src/common/errors/appError.js')
const { refreshAccessToken } = await import('../../../src/features/auth/auth.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  eventBus.publish.mockResolvedValue({ id: 'event-1' })
  repository.revokeAllRefreshTokensForUser.mockResolvedValue(undefined)
  tokens.verifyRefreshToken.mockReturnValue({ type: 'refresh', sub: '42', tokenId: 'old-token-id', authVersion: 0 })
  tokens.hashToken.mockReturnValue('refresh-token-hash')
})

describe('refresh token replay protection', () => {
  it('revokes all user refresh tokens when a revoked token is replayed', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: new Date(), user: { id: 42, isActive: true, authVersion: 0 } })
    await expect(refreshAccessToken({ refreshToken: 'replayed-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
    expect(repository.findRefreshToken).toHaveBeenCalledWith('refresh-token-hash')
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled()
  })

  it('revokes all user refresh tokens when atomic rotation loses a replay race', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: null, expiresAt: new Date(Date.now() + 60000), user: { id: 42, isActive: true, authVersion: 0 } })
    tokens.createRefreshToken.mockReturnValue('new-refresh-token')
    tokens.createAccessToken.mockReturnValue('access-token')
    tokens.hashToken.mockReturnValueOnce('old-token-hash').mockReturnValueOnce('new-token-hash')
    repository.rotateRefreshToken.mockResolvedValue({ success: false })
    await expect(refreshAccessToken({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.rotateRefreshToken).toHaveBeenCalledTimes(1)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
  })
})
