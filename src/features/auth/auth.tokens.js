const jwt = require("jsonwebtoken")
const { env } = require("../../config")

const createAccessToken = (user) => {
  return jwt.sign(
    {
      type: "access",
    },
    env.JWT_ACCESS_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  )
}

const createRefreshToken = (user, tokenId) => {
  return jwt.sign(
    {
      type: "refresh",
      tokenId,
    },
    env.JWT_REFRESH_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  )
}

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET)
}

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET)
}

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
}
