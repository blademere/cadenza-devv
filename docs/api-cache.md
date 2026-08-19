# Generic API Cache Middleware

The template provides an opt-in Redis-backed cache middleware for read-heavy endpoints.

## Usage

```js
const express = require('express')
const { cache, asyncHandler } = require('../../common/middleware')

router.get(
  '/users/:id',
  cache({
    key: (req) => `users:${req.params.id}`,
    ttlSeconds: 60,
  }),
  asyncHandler(getUserController),
)
```

Clients do not need to send a cache header. The middleware stores successful responses in Redis and replays them until the TTL expires.

## Options

```js
cache({
  key: (req) => `users:${req.params.id}`,
  ttlSeconds: 60,
  methods: ['GET', 'HEAD'],
  varyByUser: false,
  skip: (req) => req.query.live === 'true',
})
```

By default only `GET` and `HEAD` are cached. Cache keys must be supplied explicitly or the middleware falls back to the request method plus original URL.

Use `varyByUser: true` for authenticated responses that must not be shared across users.

The middleware exposes `X-Cache: MISS` for origin responses and `X-Cache: HIT` for replayed responses.

## Invalidation

Mutating application data should invalidate any affected cache keys explicitly:

```js
await cache.invalidate(`users:${userId}`)
```

The cache layer is intentionally not coupled to application models, routes, or database operations.

## Failure behavior

Cache failures are fail-open: if Redis is unavailable or a cache operation fails, the request continues to the application handler. Cache storage errors are not allowed to take an otherwise healthy endpoint offline.

## Configuration

`API_CACHE_TTL_SECONDS` controls the default TTL. Routes can override it with `ttlSeconds`.
