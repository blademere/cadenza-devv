const crypto = require('crypto')
const { BadRequestError } = require('../errors/appError')
const { env } = require('../../config')
const CSRF_COOKIE_NAME = 'csrfToken'
const CSRF_HEADER_NAME = 'x-csrf-token'

const createCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

const setCsrfCookie = (res) => {
  const token = createCsrfToken()

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
  })

  return token
}

const csrfProtection = (req, _res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME]
  if (!cookieToken || !headerToken) {
    return next(new BadRequestError('CSRF token is missing.'))
  }

  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return next(new BadRequestError('Invalid CSRF token.'))
  }

  if (cookieToken.length !== headerToken.length) {
    return next(new BadRequestError('Invalid CSRF token.'))
  }

  const cookieBuffer = Buffer.from(cookieToken, 'utf8')
  const headerBuffer = Buffer.from(headerToken, 'utf8')

  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return next(new BadRequestError('Invalid CSRF token.'))
  }
  return next()
}

module.exports = {
  CSRF_COOKIE_NAME,
  createCsrfToken,
  setCsrfCookie,
  csrfProtection,
}
