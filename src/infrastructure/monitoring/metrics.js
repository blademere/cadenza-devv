const client = require("prom-client")

const register = new client.Registry()

client.collectDefaultMetrics({
  register,
  prefix: "express_app_",
})

const httpRequestsTotal = new client.Counter({
  name: "express_app_http_requests_total",
  help: "Total number of HTTP requests.",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
})

const httpRequestDuration = new client.Histogram({
  name: "express_app_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
})

const httpRequestsInProgress = new client.Gauge({
  name: "express_app_http_requests_in_progress",
  help: "Number of HTTP requests currently being processed.",
  registers: [register],
})

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInProgress,
}
