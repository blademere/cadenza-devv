const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const hpp = require("hpp");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const { rateLimiter, notFound, errorHandler } = require("./common/middleware");
const { env, requestLogger } = require("./config");
const apiRoutes = require("./routes");

const app = express();

const openApiSpec = YAML.load("docs/openapi.yaml");

app.set("trust proxy", 1);
app.use(requestLogger);
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Service is healthy.",
    data: { uptime: process.uptime() },
  });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api/v1", apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
