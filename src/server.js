const app = require("./app");
const { env, logger } = require("./config");

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down server.");
  server.close(() => {
    logger.info("Server closed.");
  });
});
