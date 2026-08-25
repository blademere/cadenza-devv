const { rateLimit } = require('express-rate-limit')
const RedisRateLimitStore = require('./redisRateLimitStore')

const authRateLimitHandler = (_req, res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many authentication requests. Please try again later.',
  })
}

const createAuthLimiter = ({ prefix, limit, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: authRateLimitHandler,
    store: new RedisRateLimitStore(prefix),
  })

const loginRateLimiter = createAuthLimiter({ prefix: 'auth-login-rate-limit', limit: 5, skipSuccessfulRequests: true })
const registerRateLimiter = createAuthLimiter({ prefix: 'auth-register-rate-limit', limit: 3, skipSuccessfulRequests: true })
const refreshRateLimiter = createAuthLimiter({ prefix: 'auth-refresh-rate-limit', limit: 30 })
const logoutRateLimiter = createAuthLimiter({ prefix: 'auth-logout-rate-limit', limit: 30 })
const oauthRateLimiter = createAuthLimiter({ prefix: 'auth-oauth-rate-limit', limit: 20 })

module.exports = {
  loginRateLimiter,
  registerRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
}
