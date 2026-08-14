const app = require("./app")
const { env } = require("./config")
const {
  initializeSentry,
  flushSentry,
} = require("./infrastructure/monitoring/sentry")

initializeSentry()

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`)
})

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`)

  server.close(async () => {
    await flushSentry()

    process.exit(0)
  })
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
