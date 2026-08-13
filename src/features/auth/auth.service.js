const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const { UnauthorizedError } = require("../../common/errors/appError")

const { env } = require("../../config")

const { findUserByEmail, findUserById } = require("./auth.repository")

const { createAccessToken, createRefreshToken } = require("./auth.tokens")

const login = async ({ email, password }) => {
  const user = await findUserByEmail(email)

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid credentials.")
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    throw new UnauthorizedError("Invalid credentials.")
  }

  return {
    accessToken: createAccessToken(user),

    refreshToken: createRefreshToken(user),

    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  }
}

const refreshAccessToken = async ({ refreshToken }) => {
  let payload

  try {
    payload = jwt.verify(refreshToken, env.JWT_SECRET)
  } catch (_error) {
    throw new UnauthorizedError("Refresh token is invalid or expired.")
  }

  if (payload.type !== "refresh" || !payload.sub) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  const user = await findUserById(payload.sub)

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Refresh token is invalid.")
  }

  return {
    accessToken: createAccessToken(user),
  }
}

module.exports = {
  login,
  refreshAccessToken,
}
