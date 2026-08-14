const client = require('prom-client')

const register = new client.Registry()

client.collectDefaultMetrics({
  register,
  prefix: '',
})

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
})

const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of HTTP requests currently being processed',
})

register.registerMetric(httpRequestsTotal)
register.registerMetric(httpRequestDuration)
register.registerMetric(httpActiveRequests)

const prometheusMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint()

  httpActiveRequests.inc()

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000_000

    const route = req.route?.path || req.path || 'unknown'

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    }

    httpRequestsTotal.inc(labels)

    httpRequestDuration.observe(labels, duration)

    httpActiveRequests.dec()
  })

  next()
}

const metricsHandler = async (_req, res) => {
  res.set('Content-Type', register.contentType)

  res.end(await register.metrics())
}

module.exports = {
  register,
  prometheusMiddleware,
  metricsHandler,
}
