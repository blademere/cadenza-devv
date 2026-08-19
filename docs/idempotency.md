# Generic Idempotency Middleware

The template provides a reusable Express middleware for endpoints where clients may safely retry the same write request.

## Usage

```js
const express = require('express')
const { authenticate, idempotency, validate, asyncHandler } = require('../../common/middleware')

router.post(
  '/orders',
  authenticate,
  idempotency({ scope: 'orders' }),
  validate(createOrderValidator),
  asyncHandler(createOrderController),
)
```

Clients send:

```http
Idempotency-Key: 01JEXAMPLE-CLIENT-KEY
```

The middleware scopes the key by application scope, authenticated user, HTTP method, and route. It also fingerprints the request body. Reusing the same key with a different request returns `409 Conflict`.

A successfully completed response is stored in Redis for `IDEMPOTENCY_TTL_SECONDS` and replayed for subsequent requests. Failed responses with status 500 or higher release the key so the client can retry.

## Options

```js
idempotency({
  scope: 'payments',
  ttlSeconds: 86400,
  required: true,
  methods: ['POST', 'PUT', 'PATCH'],
})
```

`required` defaults to `true`. Set it to `false` when the middleware should only provide idempotency when the client supplies the header.

## Existing specialized idempotency

Domain-specific idempotency remains in subsystems such as notification delivery and webhooks. The generic middleware is intended for application write endpoints and does not replace those delivery-level guarantees.
