# Platform Request and Correlation Context

## Purpose

Platform execution context provides a single correlation contract across HTTP requests, services, events, jobs, and workflow operations.

The platform keeps the existing request ID middleware as the source of truth for HTTP request IDs. It does not introduce a second request-ID mechanism.

## Identifier contract

| Identifier | Source | Purpose |
|---|---|---|
| `requestId` | `X-Request-ID` or generated UUID | Identifies one HTTP request/execution entry point |
| `correlationId` | `X-Correlation-ID` or `requestId` | Connects related work across asynchronous boundaries |
| `causationId` | Explicit event/job caller | Identifies the immediate preceding event when needed |

Incoming IDs are bounded and validated by the context middleware. When no correlation ID is supplied, it is set to the request ID.

## Propagation

```text
HTTP request
  ├── requestId
  └── correlationId
       │
       ├── service operation
       │
       ├── event/outbox
       │     └── correlationId + execution context metadata
       │
       ├── job
       │     └── correlationId + execution context metadata
       │
       └── workflow
             └── event/audit correlation
```

Events use the active platform context when a caller does not explicitly provide a correlation ID. Jobs copy the active context into reserved `_platformContext` job data and restore it when a platform job worker executes.

Workflow events therefore inherit the same correlation ID without requiring OBO or another domain module to know how correlation is implemented.

## Logging and errors

Request and correlation IDs are available to the request logger and error handler. HTTP responses expose both identifiers through response headers.

The error handler also records correlation IDs in structured logs and error-monitoring request metadata.

## Boundaries

The generic context contains execution metadata only:

```js
{
  requestId,
  correlationId,
  actorId,
  actorType,
  organizationId,
  metadata
}
```

Business/domain state must not be placed in the generic context. Modules and features remain responsible for their domain data and workflow semantics.

## Idempotency distinction

Correlation identifies related execution. It does not provide idempotency.

```text
HTTP idempotency
      !=
event deduplication
      !=
job retry protection
```

These mechanisms may use the correlation ID as an input, but they remain separate platform contracts.
