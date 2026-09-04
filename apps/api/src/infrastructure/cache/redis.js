import { createClient } from 'redis'
import { env, logger } from '../../config/index.js'

let redisClient

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
      },
    })

    redisClient.on('error', (error) => {
      logger.error({ err: error }, 'Redis client error')
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

export { getRedisClient, connectRedis, disconnectRedis }
