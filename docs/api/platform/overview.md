# Platform Overview

The API platform is the reusable mechanism layer for application modules and shared features.

## Architecture

The dependency direction is:

```text
modules
   ↓
features
   ↓
platform
   ↓
infrastructure
```

The core rule is:

> Modules and features decide **why** and **when** a capability is used. Platform decides **how** the reusable mechanism works. Infrastructure provides concrete technical implementations.

## What belongs in platform

Platform owns generic mechanisms that can serve more than one module or feature, including:

- authorization enforcement and permission evaluation;
- workflow execution and version lifecycle;
- transactional event/outbox delivery;
- background job execution and retry policy;
- notification delivery mechanisms;
- generic forms and configurable field behavior;
- scheduler primitives;
- rules execution mechanisms;
- request/correlation execution context;
- platform-owned configuration;
- operational observability;
- audit mechanisms and other reusable infrastructure boundaries.

Platform code must remain domain-neutral. It must not encode OBO, permit, professional, receiving, inspection, or other application-specific business rules.

## What does not belong in platform

Do not create platform modules for application domains:

```text
platform/obo/
platform/permits/
platform/professionals/
platform/receiving/
platform/plan-permits/
platform/applications/
platform/inspection/
```

Domain workflows, policies, terminology, and business decisions remain in the owning module or feature.

## Persistence boundary

Application services use repositories for persistence:

```text
service
   ↓
repository
   ↓
Prisma / infrastructure
```

New platform services must follow the same repository boundary. A small list of pre-existing platform services with direct Prisma access is explicitly tracked as technical debt by the architecture validator; those exceptions must not be expanded.

## Execution context

The platform execution context carries only generic execution metadata:

```js
{
  requestId,
  correlationId,
  actorId,
  actorType,
  organizationId,
  metadata,
}
```

Business entities and domain state remain explicit service parameters rather than being placed in context.

## Reliability contracts

### Transactions and events

When a domain state change requires an event, the state change and outbox record should be committed in the same transaction:

```text
BEGIN
  ├── state change
  └── outbox event
COMMIT
  ↓
outbox delivery
  ↓
queue / consumers
```

### Idempotency

These are separate contracts:

```text
HTTP idempotency
      ≠
event deduplication
      ≠
job retry protection
```

The platform provides the mechanisms; the consuming module or feature defines the business semantics.

### Workflow

The workflow engine provides atomic transitions, optimistic concurrency, immutable published/archived versions, transactional transition events, and correlation-aware history. Domains define their own workflow states and transitions.

### Jobs and events

Events and jobs use bounded retries, structured operational logging, correlation propagation, and failure recovery boundaries. Consumers must be safe under at-least-once delivery.

## Security boundary

Generic security enforcement follows:

```text
Authentication
      ↓
Authorization
      ↓
Resource / policy access
      ↓
Audit
```

Authorization failures are denied by default. Audit failure must not convert a denial into an allow decision. Business authorization decisions that require domain knowledge remain with the consuming module or feature.

## Configuration boundary

Application environment input is validated centrally, then exposed to platform services through `platform/configuration`:

```text
Environment / deployment
          ↓
      config/env.js
          ↓
platform/configuration
          ↓
platform services
```

Platform configuration is limited to generic system, operational, and mechanism settings. Domain-specific configuration remains domain-owned.

## Observability boundary

The platform uses the existing application logger and a lightweight metrics/tracing abstraction. Standard operational metadata includes:

- operation;
- request ID;
- correlation ID;
- actor ID;
- duration;
- structured errors.

Metrics use low-cardinality labels. Monitoring vendors remain outside the platform contract.

## Architecture enforcement

Static validation enforces the dependency direction and persistence rules. It also checks mutation-route idempotency and resource authorization requirements.

Architecture tests should accompany enforceable boundaries so that documentation and implementation remain aligned.

## Platform documentation

| Area | Documentation |
| --- | --- |
| Execution context | `docs/api/platform/context.md` |
| Events and outbox | `docs/api/platform/events.md` |
| Jobs | `docs/api/platform/jobs.md` |
| Workflow | `docs/api/platform/workflow.md` |
| Idempotency | `docs/api/platform/idempotency.md` |
| Observability | `docs/api/platform/observability.md` |
| Architecture rules | `docs/api/platform/architecture-rules.md` |
| Configuration | `docs/api/platform/phase-11-configuration.md` |
| Event/outbox infrastructure | `docs/api/event-infrastructure.md` |

The authoritative cross-layer contract remains `docs/api/architecture.md`.

## Change rules

Before adding or changing platform code:

1. Confirm the capability is generic and reusable.
2. Keep dependencies pointed downward.
3. Reuse an existing platform mechanism before creating another one.
4. Keep persistence behind repositories.
5. Keep domain decisions in modules/features.
6. Add architecture tests for new static boundaries.
7. Document stable platform guarantees.
8. Do not introduce domain-specific platform directories.
