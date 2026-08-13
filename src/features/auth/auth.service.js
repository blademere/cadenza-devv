const crypto = require("crypto")
const bcrypt = require("bcrypt")

const { UnauthorizedError } = require("../../common/errors/appError")

const {
  findUserByEmail,
  findUserById,
  createRefreshTokenRecord,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} = require("./auth.repository")

const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require("./auth.tokens")

const { env } = require("../../config")

const getRefreshTokenExpiration = () => {
  const expiresIn = env.JWT_REFRESH_EXPIRES_IN

  const match = expiresIn.match(/^(\d+)([smhd])$/)

  if (!match) {
    throw new Error("JWT_REFRESH_EXPIRES_IN must use s, m, h, or d format.")
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
    throw new UnauthorizedError("Invalid credentials.")
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)

  if (!passwordValid) {
    throw new UnauthorizedError("Invalid credentials.")
  }

  const tokenId = createTokenId()

  const accessToken = createAccessToken(user)

  const refreshToken = createRefreshToken(user, tokenId)

  await createRefreshTokenRecord({
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
  } catch (_error) {
    throw new UnauthorizedError("Refresh token is invalid or expired.")
  }

  if (payload.type !== "refresh" || !payload.sub || !payload.tokenId) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  const storedToken = await findRefreshToken(refreshToken)

  if (!storedToken) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  if (storedToken.revokedAt) {
    /*
     * Token reuse detected.
     *
     * Revoke all refresh tokens for this
     * user because the token may have been stolen.
     */
    await revokeAllRefreshTokensForUser(storedToken.userId)

    throw new UnauthorizedError("Refresh token has already been revoked.")
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new UnauthorizedError("Refresh token is expired.")
  }

  if (storedToken.userId !== Number(payload.sub)) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  if (storedToken.user.id !== Number(payload.sub)) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  if (!storedToken.user.isActive) {
    throw new UnauthorizedError("User account is inactive.")
  }

  /*
   * Rotate refresh token.
   */
  await revokeRefreshToken(storedToken.id)

  const newTokenId = createTokenId()

  const newRefreshToken = createRefreshToken(storedToken.user, newTokenId)

  await createRefreshTokenRecord({
    token: newRefreshToken,
    userId: storedToken.user.id,
    expiresAt: getRefreshTokenExpiration(),
  })

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

  try {
    const payload = verifyRefreshToken(refreshToken)

    if (payload.type !== "refresh") {
      return
    }
  } catch (_error) {
    return
  }

  const storedToken = await findRefreshToken(refreshToken)

  if (!storedToken) {
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
