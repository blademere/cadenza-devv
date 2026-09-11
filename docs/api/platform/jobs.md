# Platform Job Reliability

## Purpose

The platform job layer provides generic queue execution, retry policy, correlation propagation, and operational logging. Domain modules own the meaning of each job.

## Job contract

A platform job should have:

```text
jobId
jobType
correlationId
attempts
status
scheduledAt
completedAt
```

BullMQ is the execution infrastructure. Job payloads may carry reserved `_platformContext` metadata:

```js
{
  requestId,
  correlationId,
  actorId,
  actorType,
  organizationId
}
```

Workers restore this context before invoking the domain processor.

## Retry policy

The shared job service applies bounded retry settings:

- default attempts: `5`
- maximum attempts: `20`
- default backoff: exponential, starting at `1000ms`
- maximum backoff delay: `24h`
- delayed execution is bounded to `24h`
- completed jobs are retained for one day, subject to the configured count limit
- failed jobs are retained for seven days, subject to the configured count limit

Job callers may choose a lower retry budget when the operation is safe to retry fewer times. The platform validates the retry policy so individual callers cannot accidentally configure unbounded execution.

## Failure and dead-letter behavior

A failed BullMQ job remains in the failed-job set rather than being silently discarded. This is the platform dead-letter/recovery boundary for queue execution.

The distinction from the event outbox is important:

```text
EventOutbox
  = durable event delivery / enqueue state

BullMQ failed job
  = event or job execution failure
```

The outbox is marked `PROCESSED` after the event has been durably enqueued into the platform event queue. Event processing failures are then handled by BullMQ retries and its failed-job retention.

Do not add business-specific retry loops inside domain processors.

## Idempotent execution

Queue delivery is at-least-once. A worker can receive the same job again after a crash or retry. Job processors must therefore be safe to execute more than once.

Use a domain-appropriate idempotency key or an atomic state transition when the operation has side effects. The job platform does not merge HTTP idempotency, event deduplication, and job retry protection into one mechanism.

## Correlation

Jobs inherit the active request/correlation context when they are created. Workers restore that context before processing so downstream logs, events, notifications, and workflow operations remain connected to the original execution.

## Logging

Standard BullMQ worker logs include:

- queue
- job ID
- job type
- attempts
- maximum attempts
- duration when available
- request ID
- correlation ID
- actor ID
- error information for failures

Event workers additionally log event ID and event type at enqueue and processing boundaries.

## Domain boundary

Platform:

- owns queue mechanics
- owns retry validation
- owns context propagation
- owns operational logging
- exposes failed-job recovery primitives

Modules/features:

- decide which jobs exist
- decide job payload semantics
- decide whether an operation is safe to retry
- implement business-level idempotency

Do not create domain-specific platform job queues such as `platform/obo` or `platform/permits`.
