# Documentation Index

This directory contains the repository's architecture, platform-engineering, operations, and public API documentation.

## Start here

1. **[Application Architecture](architecture.md)** — authoritative dependency direction, layer responsibilities, shared foundations, public API boundaries, module strategy, and roadmap.
2. **[Platform Integration](platform-integration.md)** — integration pattern for transactional events, workers, rules, audit, and notifications.
3. **[OpenAPI](openapi.yaml)** — public HTTP API contract. It should describe routes actually exposed by the application, not internal feature services or future domain APIs.
4. **[Production Operations](production-operations.md)** — deployment, migration, backup, queue, Redis, audit, and rollback guidance.

## Architecture and platform documentation

| Document | Purpose | Architectural role |
| --- | --- | --- |
| [architecture.md](architecture.md) | Application boundaries and roadmap | Source of truth |
| [platform-integration.md](platform-integration.md) | Shared business to platform integration | Integration pattern |
| [dynamic-forms.md](dynamic-forms.md) | Configuration-driven forms and validation | Platform capability |
| [workflow-engine.md](workflow-engine.md) | Generic workflow/versioning | Platform capability |
| [business-automation.md](business-automation.md) | Rules, approvals, notifications, and SLA | Deferred/reusable platform capability |
| [platform-extensibility.md](platform-extensibility.md) | Custom fields, dashboards, integrations, and events | Deferred/reusable platform capability |
| [event-infrastructure.md](event-infrastructure.md) | Transactional outbox and event delivery | Platform infrastructure |

These documents describe mechanisms. They must not be interpreted as permission to place domain-specific permit, rental, enrollment, or other application rules into `src/platform/`.

## Technical capability documentation

| Document | Purpose |
| --- | --- |
| [api-cache.md](api-cache.md) | Redis-backed HTTP response caching |
| [idempotency.md](idempotency.md) | Generic write-request idempotency |
| [scheduler.md](scheduler.md) | Generic background-job scheduling primitives; not the appointment slot engine |
| [search.md](search.md) | Provider-neutral search contract; currently deferred |
| [object-storage.md](object-storage.md) | Provider-neutral object-storage boundary and provider registration |

## Operations

- [production-operations.md](production-operations.md) — production runbook and recovery policy.

## Documentation rules

### Implemented vs planned

Documentation must distinguish between:

- **implemented** behavior that exists in the repository and is wired into application behavior;
- **platform capability** that exists as a reusable mechanism but may not yet be used by a product module;
- **deferred capability** that remains in the repository but is intentionally not part of the current application scope;
- **planned architecture** that describes where future domain functionality belongs.

Do not describe a placeholder directory, installed dependency, or future module as an implemented product feature.

### Current API boundary

The application currently mounts authentication, users, and appointments as public application APIs. Generic document, notification, and audit-log routers remain internal reusable features and are not automatically exposed as public roots.

When a future domain module needs those capabilities, expose them through the domain-owned API rather than adding generic platform CRUD routes.

### Domain neutrality

Shared documentation should use generic concepts such as `Case`, `Person`, `Task`, `Requirement`, and `subjectType` unless a domain example materially improves understanding.

When using OBO/permit examples, explicitly treat them as future module usage. The example must not imply that OBO is already implemented in the repository.

### Layer ownership

Use this rule when adding documentation:

```text
Domain decision
      ↓
module / feature service
      ↓
platform mechanism
      ↓
infrastructure provider
```

Platform documentation must explain **how** a mechanism works, not **why** a particular business domain needs it.

### Persistence

Feature and module services should follow the repository boundary:

```text
service → repository → Prisma/infrastructure
```

Documentation and examples should not encourage direct Prisma access from services when a repository exists.

### Dynamic data

Dynamic forms and custom fields are for genuinely variable configuration-driven data. They do not replace strongly modeled relationships for identity, cases, participants, workflow state, permit types, professional registration, or other core business concepts.

### Appointments

Appointments are a shared business feature because slot generation, availability, capacity, booking, and appointment lifecycle are business behavior. The current feature is intentionally retained and exposed temporarily at `/api/v1/appointments`. The eventual OBO module should own the public business-facing submission-appointment API and should not use the appointment feature as an inspection workflow unless that reuse is explicitly established.

### Storage boundary

Document features must use the platform storage service rather than selecting infrastructure providers directly:

```text
features/documents → platform/storage → infrastructure/storage
```

Provider registration belongs at the application composition root.

### Email boundary

Resend is the active email provider. Application code should use the infrastructure email boundary rather than importing provider-specific clients directly:

```text
application → infrastructure/email → Resend
```

### Offline professional signing

For the future OBO module, professional signing of hardcopy documents remains an offline business process. It should not be documented as an application signing workflow unless the requirements change.

## Roadmap terminology

The repository currently follows:

- **Phase 1 — Architecture cleanup:** completed.
- **Phase 2 — Shared business foundations:** completed and hardened.
- **Phase 3 — Platform integration:** **in progress**; current cleanup includes explicit storage and email boundaries, retained appointment slot generation, and domain-first public API boundaries.
- **Phase 4 — Domain modules:** later; implement real application domains only when there is a concrete business requirement.

The eventual OBO/permit system belongs under `src/modules/obo/`. Do not create placeholder domain modules merely to reserve future names.
