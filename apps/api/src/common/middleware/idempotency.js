const crypto = require('node:crypto')

const { connectRedis } = require('../../infrastructure/cache/redis')
const { ConflictError } = require('../errors/appError')

const DEFAULT_TTL_SECONDS = 24 * 60 * 60
const IDEMPOTENCY_HEADER = 'Idempotency-Key'
const MAX_KEY_LENGTH = 255

const hashRequest = (req) => {
  const payload = JSON.stringify({
    method: req.method,
    originalUrl: req.originalUrl,
    body: req.body ?? null,
  })

  return crypto.createHash('sha256').update(payload).digest('hex')
}

const buildRedisKey = ({ req, key, scope = 'api' }) => {
  const userId = req.user?.id ?? 'anonymous'
  const route = req.route?.path || req.path
  const encodedKey = encodeURIComponent(key)

  return `idempotency:${scope}:${userId}:${req.method}:${route}:${encodedKey}`
}

const parseEntry = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const replayEntry = (res, entry) => {
  res.status(entry.statusCode)

  if (entry.contentType) {
    res.set('Content-Type', entry.contentType)
  }

  res.set('Idempotency-Replayed', 'true')
  return res.send(entry.body)
}

const idempotency = (options = {}) => {
  const methods = new Set(options.methods || ['POST', 'PUT', 'PATCH', 'DELETE'])
  const ttlSeconds = Math.max(
    1,
    Number(options.ttlSeconds || process.env.IDEMPOTENCY_TTL_SECONDS || DEFAULT_TTL_SECONDS),
  )
  const scope = options.scope || 'api'
  const required = options.required !== false

  return async (req, res, next) => {
    if (!methods.has(req.method)) return next()

    const key = req.get(IDEMPOTENCY_HEADER)?.trim()

    if (!key) {
      if (!required) return next()
      return next(
        new ConflictError(`${IDEMPOTENCY_HEADER} header is required for this operation.`),
      )
    }

    if (key.length > MAX_KEY_LENGTH) {
      return next(
        new ConflictError(`${IDEMPOTENCY_HEADER} must not exceed ${MAX_KEY_LENGTH} characters.`),
      )
    }

    try {
      const redis = await connectRedis()
      const redisKey = buildRedisKey({ req, key, scope })
      const requestHash = hashRequest(req)
      const inProgressEntry = JSON.stringify({
        status: 'IN_PROGRESS',
        requestHash,
      })

      const claimed = await redis.set(redisKey, inProgressEntry, {
        NX: true,
        EX: ttlSeconds,
      })

      if (!claimed) {
        const existing = parseEntry(await redis.get(redisKey))

        if (!existing) {
          return next(
            new ConflictError('A request with this Idempotency-Key is already in progress.'),
          )
        }

        if (existing.requestHash !== requestHash) {
          return next(
            new ConflictError('The Idempotency-Key was already used with a different request.'),
          )
        }

        if (existing.status === 'IN_PROGRESS') {
          return next(
            new ConflictError('A request with this Idempotency-Key is already in progress.'),
          )
        }

        if (existing.status === 'COMPLETED') {
          return replayEntry(res, existing)
        }

        return next(new ConflictError('The idempotency state is invalid.'))
      }

      let responseBody
      let responseCaptured = false

      const originalSend = res.send.bind(res)
      const originalJson = res.json.bind(res)

      res.send = (body) => {
        responseBody = body
        responseCaptured = true
        return originalSend(body)
      }

      res.json = (body) => {
        responseBody = body
        responseCaptured = true
        return originalJson(body)
      }

      res.once('finish', () => {
        const persist = async () => {
          try {
            if (!responseCaptured || res.statusCode >= 500) {
              await redis.del(redisKey)
              return
            }

            const completedEntry = JSON.stringify({
              status: 'COMPLETED',
              requestHash,
              statusCode: res.statusCode,
              contentType: res.get('Content-Type') || null,
              body: responseBody,
            })

            await redis.set(redisKey, completedEntry, { EX: ttlSeconds })
          } catch {
            // Idempotency storage must never break the completed HTTP response.
          }
        }

        void persist()
      })

      req.idempotency = {
        key,
        redisKey,
        requestHash,
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

idempotency.hashRequest = hashRequest
idempotency.buildRedisKey = buildRedisKey
idempotency.parseEntry = parseEntry
idempotency.IDEMPOTENCY_HEADER = IDEMPOTENCY_HEADER
idempotency.DEFAULT_TTL_SECONDS = DEFAULT_TTL_SECONDS

module.exports = idempotency
