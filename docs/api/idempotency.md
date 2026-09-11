# Generic HTTP Idempotency Middleware

The application already has a shared HTTP idempotency middleware for write endpoints where clients may safely retry the same command.

## Contract

Clients send:

```http
Idempotency-Key: 01JEXAMPLE-CLIENT-KEY
```

The middleware scopes the key by:

- application scope
- organization/tenant when present
- authenticated user when present
- HTTP method
- route
- hashed idempotency key

It also fingerprints the request method, URL, and body. Reusing the same key with a different request returns `409 Conflict`.

A key is claimed with Redis `SET ... NX` before the handler runs. The claim has an in-progress TTL so concurrent requests cannot execute the same command at the same time.

Successfully completed responses are stored in Redis and replayed for subsequent requests with:

```http
Idempotency-Replayed: true
```

Server-error responses release the claim so the client can retry.

Claim finalization is ownership-safe. A request can only complete or release the Redis entry while it still owns its claim token. This prevents an expired long-running request from deleting or overwriting a newer request's claim.

## Usage

```js
const requireIdempotency = idempotency({
  scope: 'orders',
  required: true,
})

router.post(
  '/orders',
  authenticate,
  validate(createOrderValidator),
  requireIdempotency,
  asyncHandler(createOrderController),
)
```

`required` defaults to `true`. Set it to `false` only when the endpoint supports both idempotent and ordinary requests.

Options:

```js
idempotency({
  scope: 'payments',
  ttlSeconds: 86400,
  inProgressTtlSeconds: 300,
  required: true,
  methods: ['POST', 'PUT', 'PATCH'],
})
```

`IDEMPOTENCY_TTL_SECONDS` controls completed-entry retention. `IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS` controls the claim lifetime. Values are bounded to prevent accidental unbounded Redis retention.

## Required HTTP operations

Idempotency should be required for state-changing HTTP commands, including:

- create
- submit
- approve
- decline
- transition
- delete/revoke
- other commands that can be safely retried by the client

The architecture validator requires mutation routes to use the shared middleware unless the route contains an explicit, justified `idempotency: exempt` annotation.

## Important boundary

HTTP idempotency is not the same mechanism as event or job reliability:

```text
HTTP command
    ↓
Idempotency-Key + response replay

Event delivery
    ↓
Event/outbox idempotency + consumer deduplication

Job execution
    ↓
Stable job identity + retry-safe processor
```

These mechanisms may share platform conventions, but an HTTP idempotency key must not be treated as an event deduplication key or a job retry key.

## Existing specialized guarantees

Notification delivery, event outbox processing, and other delivery-level subsystems retain their own idempotency/deduplication guarantees. The generic HTTP middleware does not replace those guarantees.
