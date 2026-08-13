const { UnauthorizedError } = require("../errors/appError")
const jwt = require("jsonwebtoken")
const { env } = require("../../config")

const authenticate = (req, _res, next) => {
  const authorizationHeader = req.headers.authorization || ""

  const [scheme, token] = authorizationHeader.split(" ")

  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Missing or invalid access token."))
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET)

    if (!payload.sub) {
      return next(new UnauthorizedError("Access token is invalid."))
    }

    req.user = {
      id: String(payload.sub),
    }

    return next()
  } catch (_error) {
    return next(new UnauthorizedError("Access token is invalid or expired."))
  }
}

module.exports = authenticate
