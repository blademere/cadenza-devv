const { UnauthorizedError } = require("../errors/appError")

const { verifyAccessToken } = require("../../features/auth/auth.tokens")

const authenticate = (req, _res, next) => {
  const authorizationHeader = req.headers.authorization || ""

  const [scheme, token] = authorizationHeader.trim().split(/\s+/)

  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Missing or invalid access token."))
  }

  try {
    const payload = verifyAccessToken(token)

    if (payload.type !== "access") {
      return next(new UnauthorizedError("Access token is invalid."))
    }

    if (!payload.sub) {
      return next(new UnauthorizedError("Access token is invalid."))
    }

    const userId = Number(payload.sub)

    if (!Number.isInteger(userId) || userId <= 0) {
      return next(new UnauthorizedError("Access token is invalid."))
    }

    req.user = {
      id: userId,
    }

    return next()
  } catch (_error) {
    return next(new UnauthorizedError("Access token is invalid or expired."))
  }
}

module.exports = authenticate
