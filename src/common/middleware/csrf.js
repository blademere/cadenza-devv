const crypto = require("crypto")

const { BadRequestError } = require("../errors/appError")

const CSRF_COOKIE_NAME = "csrfToken"
const CSRF_HEADER_NAME = "x-csrf-token"

const createCsrfToken = () => {
  return crypto.randomBytes(32).toString("hex")
}

const setCsrfCookie = (res) => {
  const token = createCsrfToken()

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  return token
}

const csrfProtection = (req, _res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]

  const headerToken = req.headers[CSRF_HEADER_NAME]

  if (!cookieToken || !headerToken) {
    return next(new BadRequestError("CSRF token is missing."))
  }

  if (cookieToken.length !== headerToken.length) {
    return next(new BadRequestError("Invalid CSRF token."))
  }

  const cookieBuffer = Buffer.from(cookieToken)

  const headerBuffer = Buffer.from(headerToken)

  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return next(new BadRequestError("Invalid CSRF token."))
  }

  return next()
}

module.exports = {
  CSRF_COOKIE_NAME,
  createCsrfToken,
  setCsrfCookie,
  csrfProtection,
}
