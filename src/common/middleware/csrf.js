const crypto = require('crypto')

const { BadRequestError } = require('../errors/appError')

const { env } = require('../../config')

const CSRF_COOKIE_NAME = 'csrfToken'

const CSRF_HEADER_NAME = 'x-csrf-token'

/*
 * Generate a cryptographically secure
 * CSRF token.
 *
 * 32 random bytes = 256 bits.
 */
const createCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex')
}

/*
 * Set the CSRF cookie.
 *
 * IMPORTANT:
 *
 * This cookie intentionally cannot be HttpOnly.
 *
 * The frontend needs to read it and copy
 * the value into:
 *
 * X-CSRF-Token
 *
 * The refresh token remains HttpOnly and
 * cannot be read by JavaScript.
 */
const setCsrfCookie = (res) => {
  const token = createCsrfToken()

  res.cookie(CSRF_COOKIE_NAME, token, {
    /*
     * JavaScript needs to read the CSRF
     * cookie.
     */
    httpOnly: false,

    /*
     * Use centralized validated config.
     */
    secure: env.COOKIE_SECURE,

    /*
     * Use the same validated SameSite
     * policy as the refresh cookie.
     */
    sameSite: env.COOKIE_SAME_SITE,

    /*
     * Only set domain when configured.
     */
    domain: env.COOKIE_DOMAIN || undefined,

    /*
     * CSRF token may be required by
     * authentication endpoints and
     * potentially other API endpoints.
     */
    path: '/',

    /*
     * Keep CSRF cookie lifetime aligned
     * with the refresh session.
     */
    maxAge: env.COOKIE_REFRESH_MAX_AGE_MS,
  })

  return token
}

/*
 * Validate the double-submit CSRF token.
 *
 * Browser sends:
 *
 * Cookie:
 * csrfToken=abc
 *
 * Header:
 * X-CSRF-Token: abc
 *
 * Both values must match.
 */
const csrfProtection = (req, _res, next) => {
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]

  const headerToken = req.headers[CSRF_HEADER_NAME]

  /*
   * Missing either token.
   */
  if (!cookieToken || !headerToken) {
    return next(new BadRequestError('CSRF token is missing.'))
  }

  /*
   * Both values must be strings.
   *
   * This prevents unexpected values from
   * reaching Buffer.from().
   */
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return next(new BadRequestError('Invalid CSRF token.'))
  }

  /*
   * timingSafeEqual requires buffers of
   * identical length.
   */
  if (cookieToken.length !== headerToken.length) {
    return next(new BadRequestError('Invalid CSRF token.'))
  }

  const cookieBuffer = Buffer.from(cookieToken, 'utf8')

  const headerBuffer = Buffer.from(headerToken, 'utf8')

  /*
   * Constant-time comparison.
   *
   * This prevents timing attacks against
   * the CSRF token comparison.
   */
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
