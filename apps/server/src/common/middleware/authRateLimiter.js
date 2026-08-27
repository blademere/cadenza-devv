const crypto = require('crypto')
const { rateLimit } = require('express-rate-limit')
const RedisRateLimitStore = require('./redisRateLimitStore')

const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000
const authRateLimitHandler = (_req, res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many authentication requests. Please try again later.',
  })
}

const createAuthLimiter = ({ prefix, limit, skipSuccessfulRequests = false, keyGenerator }) =>
  rateLimit({
    windowMs: AUTH_RATE_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: authRateLimitHandler,
    ...(keyGenerator ? { keyGenerator } : {}),
    store: new RedisRateLimitStore(prefix),
  })

const normalizeIdentity = (value) => String(value || '').trim().toLowerCase()
const hashIdentity = (identity) => crypto.createHash('sha256').update(identity).digest('hex')
const getAccountIdentity = (req) => normalizeIdentity(req.body?.email)

const loginRateLimiter = createAuthLimiter({ prefix: 'auth-login-rate-limit', limit: 5, skipSuccessfulRequests: true })
const loginAccountRateLimiter = createAuthLimiter({
  prefix: 'auth-login-account-rate-limit',
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const identity = getAccountIdentity(req)
    return identity ? hashIdentity(identity) : req.ip
  },
})
const registerRateLimiter = createAuthLimiter({ prefix: 'auth-register-rate-limit', limit: 3, skipSuccessfulRequests: true })
const refreshRateLimiter = createAuthLimiter({ prefix: 'auth-refresh-rate-limit', limit: 30 })
const logoutRateLimiter = createAuthLimiter({ prefix: 'auth-logout-rate-limit', limit: 30 })
const oauthRateLimiter = createAuthLimiter({ prefix: 'auth-oauth-rate-limit', limit: 20 })

module.exports = {
  normalizeIdentity,
  hashIdentity,
  getAccountIdentity,
  loginRateLimiter,
  loginAccountRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
}
