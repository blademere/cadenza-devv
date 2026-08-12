const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.refreshToken",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
});

const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
});

module.exports = {
  logger,
  requestLogger,
};
