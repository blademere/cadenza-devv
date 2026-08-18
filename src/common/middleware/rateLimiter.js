const { getRedisClient, connectRedis } = require("../../infrastructure/cache/redis")
const { env } = require("../../config")

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 200

const rateLimiter = async (req, res, next) => {
  const key = `rate-limit:${req.ip}`

  try {
    await connectRedis()
    const redis = getRedisClient()
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.pExpire(key, WINDOW_MS)
    }

    res.set("RateLimit-Limit", String(MAX_REQUESTS))
    res.set("RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - count)))

    if (count > MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, please try again later.",
        errors: [],
      })
    }

    return next()
  } catch (error) {
    if (env.NODE_ENV !== "production") {
      return next()
    }

    // Redis is a required production dependency. Fail closed so a Redis outage
    // cannot silently disable the API rate-limit control.
    return res.status(503).json({
      success: false,
      message: "Rate limiting service is temporarily unavailable.",
      errors: [],
    })
  }
}

module.exports = rateLimiter
module.exports.rateLimiter = rateLimiter
