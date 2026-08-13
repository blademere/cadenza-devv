const { createClient } = require("redis")
const { env } = require("../../config")

let redisClient

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createClient({
      url: env.REDIS_URL,
    })

    redisClient.on("error", (error) => {
      console.error("Redis Client Error:", error)
    })
  }

  return redisClient
}

const connectRedis = async () => {
  const client = getRedisClient()

  if (!client.isOpen) {
    await client.connect()
  }

  return client
}

const disconnectRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit()
  }
}

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis,
}
