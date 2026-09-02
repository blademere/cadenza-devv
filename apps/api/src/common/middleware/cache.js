import { createHash } from 'node:crypto'
import { connectRedis as defaultConnectRedis } from '../../infrastructure/cache/redis.js'

const DEFAULT_TTL_SECONDS = 60
const MAX_TTL_SECONDS = 24 * 60 * 60
const DEFAULT_METHODS = ['GET', 'HEAD']
const DEFAULT_CACHEABLE_STATUS_CODES = new Set([200, 203, 204, 206, 300, 301, 404])

const normalizeTtl = (value) => {
  const ttl = Number(value)
  if (!Number.isFinite(ttl) || ttl < 1) throw new RangeError('Cache ttlSeconds must be a positive number.')
  return Math.min(Math.floor(ttl), MAX_TTL_SECONDS)
}
const normalizeMethods = (methods) => new Set((methods || DEFAULT_METHODS).map((method) => String(method).toUpperCase()))
const normalizeKey = (value) => {
  const key = String(value ?? '').trim()
  if (!key) throw new TypeError('Cache key must not be empty.')
  if (key.length > 512) throw new RangeError('Cache key must not exceed 512 characters.')
  return key
}
const hashKey = (key) => `api-cache:${createHash('sha256').update(key).digest('hex')}`
const defaultKey = (req) => `${req.method}:${req.originalUrl}`
const getCacheRedisKey = (key) => hashKey(normalizeKey(key))
const parseEntry = (value) => {
  if (!value) return null
  try { return JSON.parse(value) } catch { return null }
}
const replay = (res, entry) => {
  if (entry.contentType) res.set('Content-Type', entry.contentType)
  res.set('X-Cache', 'HIT')
  return res.status(entry.statusCode).send(entry.body)
}
const invalidateCache = async (key, { connectRedis = defaultConnectRedis } = {}) => {
  const redis = await connectRedis()
  return redis.del(getCacheRedisKey(key))
}

const createCache = ({ connectRedis = defaultConnectRedis } = {}) => {
  const cache = (options = {}) => {
    const ttlSeconds = normalizeTtl(options.ttlSeconds ?? process.env.API_CACHE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS)
    const methods = normalizeMethods(options.methods)
    const keyFactory = options.key || defaultKey
    const cacheableStatusCodes = new Set(options.cacheableStatusCodes || DEFAULT_CACHEABLE_STATUS_CODES)
    const varyByUser = options.varyByUser === true
    const publicOnly = options.public === true
    if (typeof keyFactory !== 'function') throw new TypeError('Cache key must be a function.')

    return async (req, res, next) => {
      if (!methods.has(req.method)) return next()
      if (options.skip && (await options.skip(req))) return next()
      if (req.user && !varyByUser && !publicOnly) return next()

      try {
        let key = keyFactory(req)
        if (key && typeof key.then === 'function') key = await key
        key = normalizeKey(key)
        if (varyByUser) key = `${key}:user:${req.user?.id ?? 'anonymous'}`
        const redisKey = getCacheRedisKey(key)
        const redis = await connectRedis()
        const cached = parseEntry(await redis.get(redisKey))
        if (cached) return replay(res, cached)

        const originalSend = res.send.bind(res)
        const originalJson = res.json.bind(res)
        let responseBody
        let responseCaptured = false
        res.send = (body) => { responseBody = body; responseCaptured = true; return originalSend(body) }
        res.json = (body) => { responseBody = body; responseCaptured = true; return originalJson(body) }
        res.once('finish', () => {
          if (!responseCaptured || !cacheableStatusCodes.has(res.statusCode)) return
          const entry = JSON.stringify({ statusCode: res.statusCode, contentType: res.get('Content-Type') || null, body: responseBody })
          redis.set(redisKey, entry, { EX: ttlSeconds }).catch(() => undefined)
        })
        res.set('X-Cache', 'MISS')
        req.cache = { key: redisKey, ttlSeconds }
        return next()
      } catch (error) {
        req.cacheError = error
        return next()
      }
    }
  }
  cache.hashKey = hashKey
  cache.defaultKey = defaultKey
  cache.getCacheRedisKey = getCacheRedisKey
  cache.normalizeKey = normalizeKey
  cache.normalizeTtl = normalizeTtl
  cache.parseEntry = parseEntry
  cache.DEFAULT_TTL_SECONDS = DEFAULT_TTL_SECONDS
  cache.MAX_TTL_SECONDS = MAX_TTL_SECONDS
  cache.invalidate = (key) => invalidateCache(key, { connectRedis })
  return cache
}

const cache = createCache()
cache.createCache = createCache

export default cache
export { cache, createCache, hashKey, defaultKey, getCacheRedisKey, normalizeKey, normalizeTtl, parseEntry }
