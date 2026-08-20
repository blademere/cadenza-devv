# Documentation

This directory contains stable repository, architecture, platform, operations, and API documentation.

## Start here

- [`../README.md`](../README.md) — formal repository entry point and current application surface.
- [`architecture.md`](architecture.md) — authoritative dependency and layer contract.
- [`modules/`](modules/) — domain-specific documentation.
- [`openapi.yaml`](openapi.yaml) — public HTTP API contract.

## Architecture and platform

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | Layer responsibilities, dependency direction, persistence boundaries |
| [dynamic-forms.md](dynamic-forms.md) | Reusable forms and configurable fields |
| [event-infrastructure.md](event-infrastructure.md) | Transactional outbox and event delivery |
| [idempotency.md](idempotency.md) | Generic write-request idempotency |
| [object-storage.md](object-storage.md) | Provider-neutral storage boundary |
| [workflow-engine.md](workflow-engine.md) | Generic workflow/versioning mechanism |
| [platform-integration.md](platform-integration.md) | Platform integration patterns |

## Technical and operations

| Document | Purpose |
|---|---|
| [api-cache.md](api-cache.md) | Redis-backed HTTP response caching |
| [scheduler.md](scheduler.md) | Generic background-job scheduling |
| [search.md](search.md) | Provider-neutral search contract |
| [production-operations.md](production-operations.md) | Deployment and operational guidance |

## Domain documentation

Domain-specific documentation belongs under `docs/modules/<module>/`.

The general documentation directory must remain domain-neutral. Do not add application-specific workflows, permit rules, domain state machines, or domain implementation plans to `architecture.md` or this index.

## Documentation rules

Documentation should describe the current implementation and stable engineering contracts. Avoid historical phase labels and temporary migration plans in general documentation.

Distinguish clearly between:

- implemented application behavior;
- reusable platform capability;
- deferred capability that remains intentionally unused;
- domain behavior documented under its module directory.

Use generic concepts in shared documentation. When a domain-specific example is necessary, link to the domain documentation rather than turning the shared document into a domain specification.

Persistence examples must preserve the repository boundary:

```text
service → repository → Prisma/infrastructure
```

Dynamic forms and custom fields are for genuinely variable configuration-driven data. They do not replace strongly modeled relationships.

Platform documentation explains **how** reusable mechanisms work. Domain documentation explains **why and when** a particular module uses them.
