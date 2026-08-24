# Documentation

This directory contains stable server architecture, platform, security, operations, and API documentation.

## Start here

- [`../../README.md`](../../README.md) — formal repository entry point and current application surface.
- [`architecture.md`](architecture.md) — authoritative dependency and layer contract.
- [`modules/`](modules/) — domain-specific documentation.
- [`../../apps/server/openapi/openapi.yaml`](../../apps/server/openapi/openapi.yaml) — public HTTP API contract.

## Architecture and platform

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | Layer responsibilities, dependency direction, persistence boundaries |
| [dynamic-forms.md](dynamic-forms.md) | Reusable forms and configurable fields |
| [event-infrastructure.md](event-infrastructure.md) | Transactional outbox and event delivery |
| [workflow-engine.md](workflow-engine.md) | Generic workflow/versioning mechanism |
| [platform-integration.md](platform-integration.md) | Integration between modules/features and platform mechanisms |
| [platform-extensibility.md](platform-extensibility.md) | Rules for extending reusable platform capabilities |
| [business-automation.md](business-automation.md) | Rules, approvals, notifications, and SLA mechanisms |
| [idempotency.md](idempotency.md) | Generic write-request idempotency |
| [object-storage.md](object-storage.md) | Provider-neutral storage boundary |

## Technical and operations

| Document | Purpose |
|---|---|
| [api-cache.md](api-cache.md) | Redis-backed HTTP response caching |
| [scheduler.md](scheduler.md) | Generic background-job scheduling |
| [search.md](search.md) | Provider-neutral search contract |
| [enforcement-contracts.md](enforcement-contracts.md) | Repository-wide behavioral and architectural enforcement contracts |
| [production-operations.md](production-operations.md) | Deployment and operational guidance |
| [security/security-and-api-contracts.md](security/security-and-api-contracts.md) | Security, audit, authorization, idempotency, and API contracts |

## API

The public HTTP contract is [`../../apps/server/openapi/openapi.yaml`](../../apps/server/openapi/openapi.yaml). Workflow, platform, and domain internals are not public APIs unless explicitly mounted by application routes.

## Domain documentation

Domain-specific documentation belongs under `docs/server/modules/<module>/`.

The server documentation directory must remain focused on server architecture and engineering. Do not add application-specific workflows, permit rules, domain state machines, or domain implementation plans to `architecture.md` or this index.

## Documentation rules

Documentation describes the current implementation and stable engineering contracts. Do not use historical phase labels, temporary migration plans, or roadmap language in general documentation.

Distinguish clearly between:

- implemented application behavior;
- reusable platform capability;
- domain behavior documented under its module directory.

Use generic concepts in shared documentation. When a domain-specific example is necessary, link to the domain documentation rather than turning the shared document into a domain specification.

Persistence examples must preserve the repository boundary:

```text
service → repository → Prisma/infrastructure
```

Dynamic forms and custom fields are for genuinely variable configuration-driven data. They do not replace strongly modeled relationships.

Platform documentation explains **how** reusable mechanisms work. Domain documentation explains **why and when** a particular module uses them.
