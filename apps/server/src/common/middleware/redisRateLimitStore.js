const { connectRedis, getRedisClient } = require("../../infrastructure/cache/redis")

class RedisRateLimitStore {
  constructor(prefix = "rate-limit") {
    this.prefix = prefix
    this.windowMs = 15 * 60 * 1000
  }

  init(options) {
    this.windowMs = options.windowMs
  }

  async increment(key) {
    await connectRedis()
    const redis = getRedisClient()
    const redisKey = `${this.prefix}:${key}`
    const totalHits = await redis.incr(redisKey)

    if (totalHits === 1) {
      await redis.pExpire(redisKey, this.windowMs)
    }

    const ttl = await redis.pTTL(redisKey)
    return {
      totalHits,
      resetTime: new Date(Date.now() + Math.max(ttl, 0)),
    }
  }

  async decrement(key) {
    await connectRedis()
    const redis = getRedisClient()
    const redisKey = `${this.prefix}:${key}`
    const remaining = await redis.decr(redisKey)

    if (remaining <= 0) {
      await redis.del(redisKey)
    }
  }

  async resetKey(key) {
    await connectRedis()
    await getRedisClient().del(`${this.prefix}:${key}`)
  }
}

module.exports = RedisRateLimitStore
