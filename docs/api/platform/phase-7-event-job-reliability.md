# Phase 7 — Event & Job Reliability

## Scope

Phase 7 hardens the existing event and job infrastructure on `chore/platform-hardening`. No domain-specific platform modules were introduced.

## Findings before hardening

The repository already had the core reliability mechanisms:

- transactional `EventOutbox` persistence
- bounded outbox retries with exponential backoff
- stale outbox lease recovery
- dead-letter state for exhausted outbox delivery
- BullMQ retries and exponential backoff
- failed-job retention and manual retry primitives
- request/correlation context propagation into jobs and events

The gaps were consistency and operational clarity rather than a missing queue system.

## Changes

### Event contract

- `EventOutbox.id` is now explicitly exposed as `eventId` in the durable event payload.
- Event processing receives `eventId` in its execution context.
- Reserved `_platformContext` values cannot be overridden by arbitrary event context.
- Existing `correlationId`, `causationId`, depth protection, and outbox idempotency remain unchanged.

### Event retry boundaries

The platform keeps two distinct retry mechanisms:

```text
Outbox delivery
  └── max 10 attempts
      └── 5s exponential backoff, capped at 300s

Queue execution
  └── 5 attempts for platform event jobs
      └── 1s exponential backoff
```

The outbox is marked `PROCESSED` once the event has been durably enqueued. Consumer execution failure is represented by the failed BullMQ job and its retry lifecycle.

### Job retry validation

The shared job service now validates:

- attempts: `1..20`
- backoff delay: `0..24h`
- scheduled delay: `0..24h`

This prevents unbounded or malformed retry policies from being introduced by individual callers.

### Job observability

Standard BullMQ worker logs now include:

- queue
- job ID
- job type
- attempts
- maximum attempts
- duration when available
- request ID
- correlation ID
- actor ID
- error information on failure

### Event observability

Platform event enqueue and processing logs include:

- event ID
- event type
- job ID where applicable
- attempts
- duration
- request ID
- correlation ID
- actor ID
- errors

## Idempotent processing contract

Queue and event delivery remain at-least-once. The platform therefore does not claim that retry configuration alone makes business handlers idempotent.

Consumers must use a domain-appropriate mechanism when duplicate execution is unsafe:

- atomic state transition
- unique domain key
- domain-owned idempotency record
- other transaction-safe deduplication strategy

`eventId` is the stable platform identifier to use when a consumer needs duplicate detection.

HTTP idempotency, event deduplication, and job retry protection remain separate contracts.

## Dead-letter/recovery boundary

The platform has two operational failure states:

```text
EventOutbox DEAD
  = event could not be durably delivered to the queue

BullMQ failed job
  = queued event/job could not be processed successfully
```

These states must not be collapsed into one generic retry mechanism because they protect different reliability boundaries.

## Tests

Added/updated unit coverage for:

- event envelope metadata
- reserved platform-context protection
- job retry policy bounds
- existing job context propagation

The existing event-outbox integration tests continue to cover transactional consistency, concurrent claiming, lease ownership, retries, dead-letter behavior, and stale recovery.

GitHub connector operations do not execute the repository's local Vitest/PostgreSQL/Redis test suite. Runtime test execution therefore remains a CI/local responsibility.

## Result

Phase 7 is complete at the platform-contract level:

- events have stable IDs
- retries are bounded
- backoff is standardized
- dead-letter boundaries are explicit
- job retry policies are validated
- correlation context is preserved
- event/job operations have structured logs
- duplicate execution is explicitly treated as an at-least-once consumer responsibility

No OBO, permit, professional, receiving, or other domain-specific platform capability was introduced.
