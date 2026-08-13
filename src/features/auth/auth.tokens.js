const jwt = require("jsonwebtoken")
const { env } = require("../../config")

const createAccessToken = (user) => {
  return jwt.sign(
    {
      type: "access",
    },
    env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_EXPIRES_IN,
    },
  )
}

const createRefreshToken = (user) => {
  return jwt.sign(
    {
      type: "refresh",
    },
    env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
  )
}

module.exports = {
  createAccessToken,
  createRefreshToken,
}
