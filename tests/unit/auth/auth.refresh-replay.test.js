import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = {
  findUserByEmail: vi.fn(),
  hashRefreshToken: vi.fn(),
  createRefreshTokenRecord: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllRefreshTokensForUser: vi.fn(),
  rotateRefreshToken: vi.fn(),
}

const tokens = {
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}

vi.mock('../../../src/features/auth/auth.repository', () => repository)
vi.mock('../../../src/features/auth/auth.tokens', () => tokens)
vi.mock('../../../src/config', () => ({
  env: {
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}))

const { UnauthorizedError } = require('../../../src/common/errors/appError')
const { refreshAccessToken } = await import('../../../src/features/auth/auth.service.js')

beforeEach(() => {
  vi.clearAllMocks()
  tokens.verifyRefreshToken.mockReturnValue({
    type: 'refresh',
    sub: '42',
    tokenId: 'old-token-id',
  })
})

describe('refresh token replay protection', () => {
  it('revokes all user refresh tokens when a revoked token is replayed', async () => {
    repository.findRefreshToken.mockResolvedValue({
      id: 'old-token-id',
      userId: 42,
      revokedAt: new Date(),
      user: { id: 42, isActive: true },
    })

    await expect(refreshAccessToken({ refreshToken: 'replayed-token' })).rejects.toBeInstanceOf(UnauthorizedError)

    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled()
  })

  it('revokes all user refresh tokens when atomic rotation loses a replay race', async () => {
    repository.findRefreshToken.mockResolvedValue({
      id: 'old-token-id',
      userId: 42,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 42, isActive: true },
    })
    tokens.createRefreshToken.mockReturnValue('new-refresh-token')
    tokens.createAccessToken.mockReturnValue('access-token')
    repository.hashRefreshToken.mockReturnValue('new-token-hash')
    repository.rotateRefreshToken.mockResolvedValue({ success: false })

    await expect(refreshAccessToken({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(UnauthorizedError)

    expect(repository.rotateRefreshToken).toHaveBeenCalledTimes(1)
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith(42)
  })
})
