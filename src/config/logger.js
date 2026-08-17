const pino = require("pino")
const pinoHttp = require("pino-http")

const isProduction = process.env.NODE_ENV === "production"

const logger = pino({
  level: isProduction ? "info" : "debug",

  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.refreshToken",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
})

const requestLogger = pinoHttp({
  logger,

  autoLogging: true,

  serializers: {
    req: () => undefined,
    res: () => undefined,
  },

  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode}`
  },

  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${err.message}`
  },

  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) {
      return "error"
    }

    if (res.statusCode >= 400) {
      return "warn"
    }

    return "info"
  },
})

module.exports = {
  logger,
  requestLogger,
}
