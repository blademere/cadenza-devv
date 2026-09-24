import crypto from 'node:crypto'
import { connectRedis } from '../../infrastructure/cache/redis.js'
import { ConflictError } from '../errors/appError.js'

const DEFAULT_TTL_SECONDS = 24 * 60 * 60
const DEFAULT_IN_PROGRESS_TTL_SECONDS = 5 * 60
const IDEMPOTENCY_HEADER = 'Idempotency-Key'
const MAX_KEY_LENGTH = 255
const MAX_TTL_SECONDS = 7 * 24 * 60 * 60

const RELEASE_IF_OWNER_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`

const COMPLETE_IF_OWNER_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
  return 1
end
return 0
`

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.min(Math.floor(parsed), MAX_TTL_SECONDS)
}

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
  const organizationId = req.user?.organizationId ?? req.organizationId ?? 'global'
  const route = req.route?.path || req.path
  const keyDigest = crypto.createHash('sha256').update(key).digest('hex')

  return `idempotency:${scope}:${organizationId}:${userId}:${req.method}:${route}:${keyDigest}`
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
  const ttlSeconds = parsePositiveInteger(
    options.ttlSeconds || process.env.IDEMPOTENCY_TTL_SECONDS,
    DEFAULT_TTL_SECONDS,
  )
  const inProgressTtlSeconds = parsePositiveInteger(
    options.inProgressTtlSeconds || process.env.IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS,
    Math.max(ttlSeconds, DEFAULT_IN_PROGRESS_TTL_SECONDS),
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
      const claimToken = crypto.randomUUID()
      const inProgressEntry = JSON.stringify({
        status: 'IN_PROGRESS',
        requestHash,
        claimToken,
      })

      const claimed = await redis.set(redisKey, inProgressEntry, {
        NX: true,
        EX: inProgressTtlSeconds,
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
              await redis.eval(RELEASE_IF_OWNER_SCRIPT, {
                keys: [redisKey],
                arguments: [claimToken],
              })
              return
            }

            const completedEntry = JSON.stringify({
              status: 'COMPLETED',
              requestHash,
              statusCode: res.statusCode,
              contentType: res.get('Content-Type') || null,
              body: responseBody,
            })

            await redis.eval(COMPLETE_IF_OWNER_SCRIPT, {
              keys: [redisKey],
              arguments: [claimToken, completedEntry, String(ttlSeconds)],
            })
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
        claimToken,
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
idempotency.DEFAULT_IN_PROGRESS_TTL_SECONDS = DEFAULT_IN_PROGRESS_TTL_SECONDS

export default idempotency
export { idempotency }
