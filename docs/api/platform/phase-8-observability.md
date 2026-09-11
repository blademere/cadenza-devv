# Phase 8 — Platform Observability

## Scope

Strengthen observability on `chore/platform-hardening` without introducing a monitoring vendor or domain-specific telemetry.

## Findings

- Pino/Pino HTTP is already the application logging implementation.
- Request IDs and correlation IDs are already propagated through the platform context.
- Event and job workers already emit structured operational logs.
- No dedicated generic metrics or tracing abstraction existed under `platform/observability`.

## Implementation

Added:

```text
apps/api/src/platform/observability/
├── metrics/
│   └── metrics.service.js
├── tracing/
│   └── tracing.service.js
├── observability.service.js
└── index.js
```

The shared operation contract standardizes:

- operation
- requestId
- correlationId
- actorId
- duration
- structured errors

Metrics support counters and duration aggregates with stable labels.

## Instrumented platform operations

- HTTP request logging
- workflow transition execution
- job execution
- BullMQ completion/failure/retry events
- authorization denials
- existing event processing logs continue to include context and duration

## Design constraints

- No domain-specific observability module.
- No OBO/permit terminology in platform implementation.
- No second logger.
- No vendor-specific monitoring dependency.
- No high-cardinality entity/request IDs in metric labels.
- Observability must not change authorization, workflow, event, or retry semantics.

## Validation

Unit coverage was added for metric normalization, counter aggregation, duration aggregation, and invalid input handling.

The GitHub connector does not execute the repository's local Vitest/PostgreSQL/Redis test suite. Therefore the new tests are committed but runtime execution still requires the repository's CI or local test environment.
