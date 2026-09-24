import crypto from 'node:crypto'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import RedisRateLimitStore from './redisRateLimitStore.js'

const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000
const LOGIN_RATE_LIMIT = 5
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
const loginAccountKeyGenerator = (req) => {
  const identity = getAccountIdentity(req)
  return identity ? hashIdentity(identity) : ipKeyGenerator(req.ip)
}

const loginRateLimiter = createAuthLimiter({
  prefix: 'auth-login-rate-limit',
  limit: LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
})

const loginAccountRateLimiterOptions = {
  windowMs: AUTH_RATE_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT,
  skipSuccessfulRequests: true,
  keyGenerator: loginAccountKeyGenerator,
}

const loginAccountRateLimiter = createAuthLimiter({
  prefix: 'auth-login-account-rate-limit',
  ...loginAccountRateLimiterOptions,
})

const registerRateLimiter = createAuthLimiter({ prefix: 'auth-register-rate-limit', limit: 3, skipSuccessfulRequests: true })
const refreshRateLimiter = createAuthLimiter({ prefix: 'auth-refresh-rate-limit', limit: 30 })
const logoutRateLimiter = createAuthLimiter({ prefix: 'auth-logout-rate-limit', limit: 30 })
const oauthRateLimiter = createAuthLimiter({ prefix: 'auth-oauth-rate-limit', limit: 20 })

export {
  AUTH_RATE_WINDOW_MS,
  LOGIN_RATE_LIMIT,
  normalizeIdentity,
  hashIdentity,
  getAccountIdentity,
  loginAccountKeyGenerator,
  loginRateLimiter,
  loginAccountRateLimiter,
  loginAccountRateLimiterOptions,
  registerRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
  oauthRateLimiter,
}
