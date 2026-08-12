const app = require("./app")
const { env, logger } = require("./config")

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`)
})

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down server.`)

  server.close(() => {
    logger.info("Server closed.")
    process.exit(0)
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
