# Transactional Event Infrastructure

Platform events are persisted to `EventOutbox` before asynchronous processing. `event-bus.publish()` is therefore a durable enqueue operation, not an immediate side-effect dispatcher.

## Flow

```text
Domain operation
    |
    v
EventOutbox (same database)
    |
    v
Platform worker
    |
    +--> rules / actions
    +--> notifications
    +--> approvals
    +--> SLA
    +--> webhooks
    +--> audit
```

## Delivery semantics

- `PENDING` and `RETRY` rows are claimed with PostgreSQL `FOR UPDATE SKIP LOCKED`.
- Claims are marked `PROCESSING` and increment `attempts`.
- Successful processing becomes `PROCESSED`.
- Failures are retried with a bounded backoff.
- Events that exceed the retry limit become `DEAD` for operational inspection.
- Stale `PROCESSING` locks are recovered by the worker.
- `idempotencyKey` prevents duplicate enqueue requests when callers provide a stable key.
- `correlationId` and `causationId` make event chains traceable.
- `depth` is bounded to prevent recursive business-rule event loops.

## Worker

Run the platform worker separately from the HTTP process:

```bash
npm run start:worker
```

The worker performs SLA maintenance and drains the event outbox continuously.

## Important rule

Do not perform irreversible external side effects before the database transaction that creates the outbox event commits. External integrations should consume the event from the worker path.
