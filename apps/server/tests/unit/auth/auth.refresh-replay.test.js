import { beforeEach, describe, expect, it, vi } from 'vitest'

const eventBus = require('../../../src/platform/event-bus/event-bus')
const repository = require('../../../src/features/auth/auth.repository.js')
const tokens = require('../../../src/features/auth/auth.tokens.js')

vi.spyOn(eventBus, 'publish').mockResolvedValue({ id: 'event-1' })
vi.spyOn(repository, 'findUserByEmail')
vi.spyOn(repository, 'hashRefreshToken')
vi.spyOn(repository, 'createRefreshTokenRecord')
vi.spyOn(repository, 'findRefreshToken')
vi.spyOn(repository, 'revokeRefreshToken')
vi.spyOn(repository, 'revokeAllRefreshTokensForUser')
vi.spyOn(repository, 'rotateRefreshToken')
vi.spyOn(tokens, 'createAccessToken')
vi.spyOn(tokens, 'createRefreshToken')
vi.spyOn(tokens, 'verifyRefreshToken')

const { UnauthorizedError } = require('../../../src/common/errors/appError')
const { refreshAccessToken } = await import('../../../src/features/auth/auth.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  repository.revokeAllRefreshTokensForUser.mockResolvedValue(undefined)
  tokens.verifyRefreshToken.mockReturnValue({ type: 'refresh', sub: '42', tokenId: 'old-token-id', authVersion: 0 })
})

describe('refresh token replay protection', () => {
  it('revokes all user refresh tokens when a revoked token is replayed', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: new Date(), user: { id: 42, isActive: true, authVersion: 0 } })
    await expect(refreshAccessToken({ refreshToken: 'replayed-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled()
  })

  it('revokes all user refresh tokens when atomic rotation loses a replay race', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'old-token-id', userId: 42, revokedAt: null, expiresAt: new Date(Date.now() + 60000), user: { id: 42, isActive: true, authVersion: 0 } })
    tokens.createRefreshToken.mockReturnValue('new-refresh-token')
    tokens.createAccessToken.mockReturnValue('access-token')
    repository.hashRefreshToken.mockReturnValue('new-token-hash')
    repository.rotateRefreshToken.mockResolvedValue({ success: false })
    await expect(refreshAccessToken({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(UnauthorizedError)
    expect(repository.rotateRefreshToken).toHaveBeenCalledTimes(1)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
  })
})
