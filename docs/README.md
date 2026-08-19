# Documentation Index

This directory contains the repository's architecture, platform-engineering, operations, and public API documentation.

## Start here

1. **[Application Architecture](architecture.md)** — authoritative dependency direction, layer responsibilities, Phase 2 foundations, module strategy, and roadmap.
2. **[Platform Integration](platform-integration.md)** — Phase 3 integration pattern for transactional events, workers, rules, audit, and notifications.
3. **[OpenAPI](openapi.yaml)** — current public HTTP API contract. It describes the routes actually exposed by the application, not future domain APIs.
4. **[Platform Extensibility](platform-extensibility.md)** — rules for keeping reusable platform mechanisms domain-neutral.
5. **[Production Operations](production-operations.md)** — deployment, migration, backup, queue, Redis, audit, and rollback guidance.

## Architecture and business-platform documentation

| Document | Purpose | Architectural role |
| --- | --- | --- |
| [architecture.md](architecture.md) | Application boundaries and roadmap | Source of truth |
| [platform-integration.md](platform-integration.md) | Shared business to platform integration | Phase 3 pattern |
| [dynamic-forms.md](dynamic-forms.md) | Configuration-driven forms and validation | Platform capability |
| [workflow-engine.md](workflow-engine.md) | Generic workflow/versioning | Platform capability |
| [business-automation.md](business-automation.md) | Rules, approvals, notifications, SLA | Platform capability |
| [platform-extensibility.md](platform-extensibility.md) | Custom fields, dashboards, integrations, events | Platform capability |
| [event-infrastructure.md](event-infrastructure.md) | Transactional outbox and event delivery | Platform infrastructure |

These documents describe mechanisms. They must not be interpreted as permission to place domain-specific permit, rental, enrollment, or other application rules into `src/platform/`.

## Technical capability documentation

| Document | Purpose |
| --- | --- |
| [api-cache.md](api-cache.md) | Redis-backed HTTP response caching |
| [idempotency.md](idempotency.md) | Generic write-request idempotency |
| [scheduler.md](scheduler.md) | Scheduling abstraction and worker responsibilities |
| [search.md](search.md) | Provider-neutral search contract |
| [object-storage.md](object-storage.md) | Object-storage abstraction |

## Operations

- [production-operations.md](production-operations.md) — production runbook and recovery policy.

## Documentation rules

### Implemented vs planned

Documentation must distinguish between:

- **implemented** behavior that exists in the repository and is wired into application behavior;
- **platform capability** that exists as a reusable mechanism but may not yet be used by a product module;
- **planned architecture** that describes where future domain functionality belongs.

Do not describe a placeholder directory, installed dependency, or future module as an implemented product feature.

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

### Offline professional signing

For the future OBO module, professional signing of hardcopy documents remains an offline business process. It should not be documented as an application signing workflow unless the requirements change.

## Roadmap terminology

The repository currently follows:

- **Phase 1 — Architecture cleanup:** completed.
- **Phase 2 — Shared business foundations:** completed and hardened.
- **Phase 3 — Platform integration:** **in progress**; connect shared business actions to audit/event infrastructure and establish the domain-neutral worker/event pattern.
- **Phase 4 — Domain modules:** later; implement real application domains only when there is a concrete business requirement.

The eventual OBO/permit system belongs under `src/modules/obo/`. Do not create placeholder domain modules merely to reserve future names.
