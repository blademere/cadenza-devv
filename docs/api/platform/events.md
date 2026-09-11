# Platform Event Reliability

## Purpose

The platform event bus provides durable event persistence, queue delivery, retries, correlation propagation, and operational logging. Modules/features decide which business events exist.

## Event contract

Events carry:

```text
eventId
eventType
occurredAt
correlationId
actor
payload
```

The durable `EventOutbox.id` is the event ID. The ID is copied into the persisted payload as `eventId` before the event is queued.

## Delivery model

```text
Domain transaction
      |
      +-- state change
      +-- EventOutbox row
      |
    COMMIT
      |
      v
Outbox publisher
      |
      v
BullMQ platform-events
      |
      v
Event processor
```

The outbox guarantees that an event is not lost between the database transaction and queue enqueue when both operations succeed under the platform's retry/lease model.

The outbox is marked `PROCESSED` after the event has been durably queued. This is delivery state, not business-handler completion state.

## Retry model

There are two separate retry boundaries:

1. **Outbox delivery retry**
   - maximum `10` delivery attempts
   - exponential delay starting at `5s`
   - maximum delay `300s`
   - stale processing leases are recovered
   - exhausted delivery attempts become `DEAD`

2. **Queue execution retry**
   - platform event jobs use `5` attempts
   - exponential backoff starts at `1000ms`
   - failed jobs remain retained for operational recovery

Do not combine these retry budgets. A database/outbox delivery failure is different from a consumer processing failure.

## Idempotent processing

Event delivery is at-least-once. A processor can run more than once if a worker fails after executing a side effect but before BullMQ records completion.

Event handlers therefore must be duplicate-safe. Where an event causes a state change, use an atomic state transition or a domain-owned idempotency record/key. The event platform does not assume business semantics and should not invent a domain deduplication rule.

`eventId` is the stable platform identifier that consumers should use when they need duplicate detection.

## Correlation and causation

Every event has a correlation ID. When published inside an active request context, the current correlation ID is propagated automatically.

`causationId` remains explicit and identifies the immediate preceding event when a caller needs causal tracing.

Reserved `_platformContext` values cannot be overwritten by caller-provided event context.

## Depth protection

Event chaining is bounded by `MAX_EVENT_DEPTH` to prevent uncontrolled recursive event loops.

## Operational logging

The platform records structured logs for event enqueue and processing with:

- event ID
- event type
- job ID where applicable
- attempt count
- request ID
- correlation ID
- actor ID
- duration
- error information on failure

## Domain boundary

Platform:

- owns the event envelope
- owns outbox persistence
- owns delivery/retry mechanics
- owns queue execution plumbing
- owns correlation propagation
- owns operational logging

Modules/features:

- define event types
- define payload semantics
- decide when events are emitted
- implement business-level duplicate safety

Do not create domain-specific event infrastructure under `platform/obo`, `platform/permits`, or similar paths.
