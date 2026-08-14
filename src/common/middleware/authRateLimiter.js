const { rateLimit } = require('express-rate-limit')

const authRateLimitHandler = (_req, res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many authentication requests. Please try again later.',
  })
}

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: authRateLimitHandler,
})

const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: authRateLimitHandler,
})

const logoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: authRateLimitHandler,
})

module.exports = {
  loginRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
}
