# Platform Observability

Platform observability provides a small, reusable operational contract for HTTP requests, workflow transitions, events, jobs, notifications, scheduler work, and authorization decisions.

## Standard fields

Platform logs should use these fields when available:

- `timestamp` — emitted by the logger
- `level` — Pino log level
- `operation` — stable operation name or HTTP method/path
- `requestId` — originating HTTP request identifier
- `correlationId` — execution-chain identifier
- `actorId` — authenticated actor when available
- `duration` — elapsed milliseconds for completed operations
- `error` / `err` — structured error information for failures

The existing Pino logger remains the logging implementation. Phase 8 does not introduce a second logger.

## Context

The platform execution context is the source for request, correlation, and actor metadata. Worker and event boundaries restore this context before business execution.

## Metrics

The platform exposes lightweight process-local metrics through `platform/observability`:

- counters via `increment()`
- duration aggregates via `observe()`
- inspection through `snapshot()`
- test/process reset through `reset()`

Metrics are intentionally implementation-neutral. No monitoring vendor or metrics backend is required by the platform.

Standard instrumented operations include:

- `platform.workflow.transition.*`
- `platform.job.execution.*`
- `platform.job.completed`
- `platform.job.failed`
- `platform.job.retries`
- `platform.authorization.denied`

Consumers should use stable, low-cardinality labels such as queue, job type, workflow, transition, resource, and action. Do not put entity IDs, request IDs, or arbitrary payload values into metric labels.

## Operation instrumentation

Use `instrument()` for an async platform operation:

```js
await instrument('workflow.transition', handler, {
  metric: 'platform.workflow.transition',
  labels: { workflow, transition },
})
```

Use `startSpan()` when a caller needs explicit completion control around an operation.

These helpers log success/failure, duration, and execution context while updating metrics.

## HTTP requests

`pino-http` remains the HTTP logger. Request logs now standardize:

- `operation`
- `requestId`
- `correlationId`
- `actorId`
- `duration`

Sensitive request and response fields remain redacted by the existing logger configuration.

## Events and jobs

Event and job workers already log correlation metadata. Phase 8 adds the common metrics contract without changing retry semantics or delivery guarantees.

Event reliability remains the responsibility of the event bus/outbox. Job retry behavior remains the responsibility of the queue/job platform.

## Authorization

Authorization denials are counted through `platform.authorization.denied`. The metric is observational only; it does not change authorization decisions or move business policy into the platform.

## Tracing boundary

`startSpan()` is a lightweight tracing abstraction backed by the same operation instrumentation contract. It does not introduce OpenTelemetry or another tracing vendor dependency. A future tracing backend can consume this boundary without changing platform callers.

## Domain boundary

Observability is generic. It must not contain OBO, permit, professional, receiving, inspection, or other domain-specific behavior.
