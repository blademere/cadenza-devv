# API Documentation

This directory contains the current API architecture, platform, security, operations, and domain documentation.

## Start here

- [`../../README.md`](../../README.md) — repository entry point and current application surface.
- [`architecture.md`](architecture.md) — authoritative dependency and layer contract.
- [`modules/`](modules/) — domain-specific API documentation.
- [`../../apps/api/openapi/openapi.yaml`](../../apps/api/openapi/openapi.yaml) — public HTTP API contract entry point.

## Architecture and platform

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | Layer responsibilities, dependency direction, persistence boundaries |
| [dynamic-forms.md](dynamic-forms.md) | Reusable forms and configurable fields |
| [event-infrastructure.md](event-infrastructure.md) | Transactional outbox and event delivery |
| [workflow-engine.md](workflow-engine.md) | Generic workflow/versioning mechanism |
| [platform-integration.md](platform-integration.md) | Integration between features and platform mechanisms |
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

The public HTTP contract starts at [`../../apps/api/openapi/openapi.yaml`](../../apps/api/openapi/openapi.yaml). The OpenAPI source is owned by the API workspace and describes the `/api/v1` contract exposed by the Express application.

Swagger UI is served by the API at `/docs`, with the OpenAPI source entry point available at `/docs/openapi.yaml` and its referenced documents served by the API documentation middleware.

Generated OpenAPI output is not a source-of-truth file.

## Domain documentation

Domain-specific documentation belongs under `docs/api/modules/<module>/`.

The API documentation directory should remain focused on current implementation, architecture, and engineering contracts. Domain-specific workflows, permit rules, and state transitions belong in the appropriate domain documentation.

## Documentation rules

Documentation describes the current implementation and stable engineering contracts. Do not add historical phase labels, temporary migration plans, obsolete source paths, or migration notes to current documentation.

Distinguish clearly between:

- implemented application behavior;
- reusable feature capability;
- reusable platform mechanism;
- domain behavior documented under its domain directory.

Use generic concepts in shared documentation. When a domain-specific example is necessary, link to the domain documentation rather than turning the shared document into a domain specification.

Persistence examples must preserve the repository boundary:

```text
service → repository → Prisma/infrastructure
```

Dynamic forms and custom fields are for genuinely variable configuration-driven data. They do not replace strongly modeled relationships.

Platform documentation explains how reusable mechanisms work. Domain documentation explains how a particular application or feature uses those mechanisms.