# Transactional Event Infrastructure

Platform events are persisted to `EventOutbox` before asynchronous processing. `event-bus.publish()` is therefore a durable enqueue operation, not an immediate side-effect dispatcher.

## Transaction invariant

When a domain state change and its business event must be atomic, both operations must execute on the same database transaction client:

```text
BEGIN TRANSACTION
    |
    +--> domain state change
    |
    +--> event-bus.publish({ db: tx, ... })
             |
             +--> EventOutbox INSERT
    |
COMMIT
    |
    v
Outbox worker
    |
    v
Event consumers
```

If the transaction rolls back, the domain write and outbox row are both rolled back. If it commits, the event remains durable even if the worker is unavailable.

Platform services that own a transaction must pass the transaction client to `publish`/`enqueueEvent`. Domain modules decide which business events exist; the platform only provides durable persistence and delivery.

## Delivery flow

```text
Domain operation
    |
    v
EventOutbox (same database transaction)
    |
    v
Outbox publisher
    |
    v
Platform job queue
    |
    v
Event worker
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
- Claims are marked `PROCESSING` and increment `attempts` before dispatch.
- A lock token and lease prevent a worker that lost ownership from completing another worker's event.
- Successful processing becomes `PROCESSED` and clears transient failure state.
- Failures use bounded exponential retry backoff, capped at five minutes.
- Events that reach `MAX_ATTEMPTS` become `DEAD` and record `deadAt` plus the final error for operational inspection.
- Stale `PROCESSING` locks are recovered only while the event still has retry budget.
- `idempotencyKey` prevents duplicate enqueue requests when callers provide a stable key.
- `correlationId` and `causationId` make event chains traceable.
- `depth` is bounded to prevent recursive business-rule event loops.

## Duplicate and ordering behavior

The outbox provides at-least-once delivery. Consumers must therefore tolerate duplicate processing. The outbox does not promise global event ordering across workers; it selects pending work by creation time, while concurrent workers may process events in parallel. Business operations that require ordering must enforce it at the domain or consumer boundary.

## Failure handling

There are two independent retry layers:

1. The outbox controls durable publication and retry scheduling.
2. The platform queue controls delivery of the claimed event job.

A failure to enqueue a platform event job leaves the outbox row retryable. A consumer failure is represented by the queue/job retry mechanism; the event outbox is marked processed only after the event job has been successfully enqueued.

## Worker

Run the platform worker separately from the HTTP process:

```bash
npm run start:worker
```

The worker performs platform maintenance and drains the event outbox continuously.

## Important rule

Do not perform irreversible external side effects before the database transaction that creates the outbox event commits. External integrations should consume the event from the worker path.
