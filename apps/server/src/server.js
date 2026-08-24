const app = require("./app")
const { env } = require("./config")
const {
  initializeSentry,
  flushSentry,
} = require("./infrastructure/monitoring/sentry")
const { disconnectPrisma } = require("./infrastructure/database/prisma")
const { disconnectRedis } = require("./infrastructure/cache/redis")
const { logger } = require("./config")

initializeSentry()

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server started")
})

let shuttingDown = false

const shutdown = async (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, "Shutdown initiated")

  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout")
    process.exit(1)
  }, 10000)
  forceExit.unref?.()

  try {
    await new Promise((resolve) => server.close(resolve))
    await Promise.allSettled([
      disconnectRedis(),
      disconnectPrisma(),
    ])
    await flushSentry()
    clearTimeout(forceExit)
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, "Graceful shutdown failed")
    clearTimeout(forceExit)
    process.exit(1)
  }
}

process.once("SIGTERM", () => shutdown("SIGTERM"))
process.once("SIGINT", () => shutdown("SIGINT"))

module.exports = { server, shutdown }
