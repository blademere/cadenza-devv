const crypto = require('crypto')
const bcrypt = require('bcrypt')

const { UnauthorizedError } = require('../../common/errors/appError')

const {
  findUserByEmail,
  hashRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,

  rotateRefreshToken,
} = require('./auth.repository')

const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require('./auth.tokens')

const { env } = require('../../config')

const getRefreshTokenExpiration = () => {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN

  const match = expiresIn.match(/^(\d+)([smhd])$/)

  if (!match) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.')
  }

  const amount = Number(match[1])
  const unit = match[2]

  const milliseconds = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return new Date(Date.now() + amount * milliseconds[unit])
}

const createTokenId = () => {
  return crypto.randomUUID()
}

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email)

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials.')
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)

  if (!passwordValid) {
    throw new UnauthorizedError('Invalid credentials.')
  }

  const tokenId = createTokenId()

  const accessToken = createAccessToken(user)

  const refreshToken = createRefreshToken(user, tokenId)

  await createRefreshTokenRecord({
    tokenId,
    token: refreshToken,
    userId: user.id,
    expiresAt: getRefreshTokenExpiration(),
  })

  return {
    accessToken,

    refreshToken,

    user: {
      id: user.id,
      email: user.email,

      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          }
        : null,
    },
  }
}

const refreshAccessToken = async ({ refreshToken }) => {
  let payload

  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new UnauthorizedError('Refresh token is invalid or expired.')
  }

  if (payload.type !== 'refresh' || !payload.sub || !payload.tokenId) {
    throw new UnauthorizedError('Refresh token is invalid.')
  }

  const userId = Number(payload.sub)

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new UnauthorizedError('Refresh token is invalid.')
  }

  const storedToken = await findRefreshToken(refreshToken)

  if (!storedToken) {
    throw new UnauthorizedError('Refresh token is invalid.')
  }

  if (storedToken.id !== payload.tokenId) {
    throw new UnauthorizedError('Refresh token is invalid.')
  }

  if (storedToken.userId !== userId) {
    throw new UnauthorizedError('Refresh token is invalid.')
  }

  if (storedToken.revokedAt) {
    await revokeAllRefreshTokensForUser(storedToken.userId)
    throw new UnauthorizedError('Refresh token has already been used.')
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new UnauthorizedError('Refresh token is expired.')
  }

  if (!storedToken.user.isActive) {
    throw new UnauthorizedError('User account is inactive.')
  }

  const newTokenId = createTokenId()

  const newRefreshToken = createRefreshToken(storedToken.user, newTokenId)

  const newTokenHash = hashRefreshToken(newRefreshToken)

  const rotation = await rotateRefreshToken({
    currentTokenId: storedToken.id,

    newTokenId,

    newTokenHash,

    userId: storedToken.user.id,

    expiresAt: getRefreshTokenExpiration(),
  })

  if (!rotation.success) {
    await revokeAllRefreshTokensForUser(storedToken.userId)
    throw new UnauthorizedError('Refresh token has already been used.')
  }

  const accessToken = createAccessToken(storedToken.user)

  return {
    accessToken,
    refreshToken: newRefreshToken,
  }
}

const logout = async ({ refreshToken }) => {
  if (!refreshToken) {
    return
  }

  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    return
  }

  if (payload.type !== 'refresh' || !payload.tokenId) {
    return
  }

  const storedToken = await findRefreshToken(refreshToken)

  if (!storedToken) {
    return
  }

  if (storedToken.id !== payload.tokenId) {
    return
  }

  if (!storedToken.revokedAt) {
    await revokeRefreshToken(storedToken.id)
  }
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
}
