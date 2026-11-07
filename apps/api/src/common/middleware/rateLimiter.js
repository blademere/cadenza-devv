import crypto from 'node:crypto'
import { connectRedis, getRedisClient } from '../../infrastructure/cache/redis.js'
import { env } from '../../config/index.js'

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 1000

const getRateLimitKey = (req) => {
  const authorization = req.get('authorization') || ''
  if (/^Bearer\s+\S+$/i.test(authorization)) {
    const tokenHash = crypto.createHash('sha256').update(authorization).digest('hex')
    return `rate-limit:auth:${tokenHash}`
  }

  return `rate-limit:ip:${req.ip}`
}

const rateLimiter = async (req, res, next) => {
  const key = getRateLimitKey(req)

  try {
    await connectRedis()
    const redis = getRedisClient()
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.pExpire(key, WINDOW_MS)
    }

    res.set('RateLimit-Limit', String(MAX_REQUESTS))
    res.set('RateLimit-Remaining', String(Math.max(0, MAX_REQUESTS - count)))

    if (count > MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        errors: [],
      })
    }

    return next()
  } catch {
    if (env.NODE_ENV !== 'production') {
      return next()
    }

    return res.status(503).json({
      success: false,
      message: 'Rate limiting service is temporarily unavailable.',
      errors: [],
    })
  }
}

export default rateLimiter
export { rateLimiter }
