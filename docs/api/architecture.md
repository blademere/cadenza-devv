# Application Architecture

This document is the authoritative architectural contract for the repository. It defines stable layer responsibilities, dependency direction, persistence boundaries, and rules for extending the application.

## Dependency direction

```text
modules → features → platform → infrastructure
```

- `modules` contain application/domain-specific behavior.
- `features` contain reusable business capabilities.
- `platform` contains reusable engines and mechanisms.
- `infrastructure` contains concrete technical providers and persistence.

`common/`, `config/`, and `routes/` support the API application boundary. They are not additional business-architecture layers.

## Layer responsibilities

### `apps/api/src/modules/`

Modules own domain terminology, domain validation, domain workflows and policies, domain-specific persistence through repositories, and domain-owned API composition.

Modules may depend on shared features and platform services. Shared layers must never import a module. Create a module only when its domain is actually implemented; do not create placeholders or duplicate shared capabilities inside a module.

### `apps/api/src/features/`

Features are reusable business capabilities that can support multiple application modules. Current examples include people, cases, participants, requirements, tasks, appointments, authentication, users, documents, notifications, and audit.

Features must remain domain-neutral. Appointments are a business feature: availability, slots, capacity, booking, and appointment lifecycle belong here. Generic background scheduling is a platform mechanism and is not the appointment implementation.

Administrative capabilities belong under the `admin` feature boundary when they manage application-wide administration rather than owning a domain's business rules. For example:

```text
features/
└── admin/
    └── authorization/
        ├── authorization.controller.js
        ├── authorization.repository.js
        ├── authorization.routes.js
        ├── authorization.service.js
        └── authorization.validation.js
```

`admin` is an administrative feature boundary, not a replacement for domain features. Administrative APIs may orchestrate domain capabilities, but the domain feature or module remains the owner of its business rules. Do not move `users`, `forms`, `appointments`, `documents`, or other domain behavior into `features/admin` merely because administrators use those capabilities.

### `apps/api/src/platform/`

Platform provides reusable mechanisms such as authorization, workflow, forms, configurable custom fields, rules, event/outbox infrastructure, jobs, generic scheduling primitives, notification mechanisms, configuration, and storage boundaries.

Platform code must be provider-neutral and domain-neutral. It provides mechanisms, not application-specific business decisions.

Authorization is a platform capability. `platform/authorization` owns permission evaluation, authorization middleware, resource authorization, authorization context, enforcement, and authorization-related caching. It must not depend on `features/admin`.

The administrative authorization feature consumes the platform authorization capability to protect administrative operations:

```text
features/admin/authorization
          │
          ▼
platform/authorization
          │
          ▼
authorization engine
```

The administrative feature owns management operations such as authorization-module management, permission management, module activation, role listing, and role-permission management. It does not replace or duplicate the authorization engine.

### `apps/api/src/infrastructure/`

Infrastructure contains concrete technology integrations and persistence implementations such as PostgreSQL/Prisma, Redis, BullMQ, Resend, OAuth providers, object storage, and monitoring providers. Infrastructure must not contain application-domain business rules or import application modules.

## Mandatory dependency rules

1. Shared `features` must not import `modules`.
2. `platform` must not import `modules` or feature implementations.
3. `platform/authorization` must not import `features/admin`.
4. `infrastructure` must not import `modules`.
5. `common` must not import `features`, `platform`, or `modules`.
6. Domain-specific behavior belongs in `modules`, not `platform`.
7. Administrative behavior belongs under `features/admin` only when it is genuinely application administration; do not use `admin` as a catch-all for domain behavior.
8. Services must not query Prisma directly when a repository boundary exists.
9. New platform services must use repositories rather than direct Prisma access.
10. Repositories own persistence queries and persistence-specific composition.
11. Do not introduce `domains/`, `core/`, `application/`, `adapters/`, or another parallel architecture layer.
12. Platform-owned configuration must be consumed through `platform/configuration`; domain-specific configuration remains owned by the domain/module.

The architecture validator enforces these boundaries where they can be checked statically. See [`docs/api/platform/architecture-rules.md`](platform/architecture-rules.md) for the Phase 9 enforcement contract and the explicitly tracked legacy persistence exceptions.

## Service and repository boundary

```text
route/controller
      ↓
service
      ↓
repository
      ↓
Prisma / infrastructure
```

Services own validation, authorization decisions, orchestration, and business behavior. Repositories own persistence operations.

A service should not call `getPrismaClient()`, `prisma.$transaction()`, or Prisma models directly when the operation belongs to its repository. Transactions spanning multiple repository operations should be coordinated through an explicit transaction boundary without exposing Prisma to business services.

Repositories may access Prisma because persistence is their responsibility.

### Platform persistence migration rule

A limited set of pre-existing platform services still accesses Prisma directly. Phase 9 records these files as explicit technical-debt exceptions in `apps/api/scripts/architecture-rules.cjs`.

Those exceptions are not permission to add more direct Prisma access. New platform services are rejected by architecture validation if they access Prisma directly. When an existing exception is migrated to a repository, remove its path from the exception list in the same change.

## Configuration boundary

Application configuration is parsed and validated centrally in `apps/api/src/config/env.js`. Platform-owned runtime settings are exposed through `apps/api/src/platform/configuration/`.

```text
Environment / deployment
          ↓
      config/env.js
          ↓
platform/configuration
          ↓
platform services
```

Platform configuration must remain generic. It may contain system, operational, and platform mechanism settings, but must not encode domain rules such as OBO permit requirements. Domain-specific configuration remains owned by the relevant module or feature.

Do not introduce a database-backed configuration store unless the application requires runtime-managed, tenant-scoped, versioned, or transactional settings. If persistence becomes necessary, keep it behind a configuration repository.

## Platform documentation

The platform capability contracts are maintained under `docs/api/platform/`:

```text
docs/api/platform/
├── overview.md
├── context.md
├── events.md
├── jobs.md
├── workflow.md
├── idempotency.md
├── observability.md
├── architecture-rules.md
└── phase-11-configuration.md
```

`overview.md` provides the platform-level entry point. Individual documents define the detailed reliability and architecture contracts for each capability.

## Shared business modeling

Use relational models for stable concepts such as identity, cases, participants, requirements, tasks, lifecycle state, and stable business relationships. Use dynamic forms and configurable custom fields for genuinely variable, configuration-driven attributes.

Dynamic data must not replace strongly modeled relationships merely to avoid schema design.

## Forms and custom fields

Forms provide the reusable mechanism for configuration-driven data capture. Custom fields are part of that mechanism rather than a separate application layer.

The platform owns generic form behavior such as field definitions, validation metadata, field types, ordering, options, visibility, submissions, and versioning. A module or feature owns the meaning of those fields in its business context.

For domain-specific forms, the module associates its business entity with a platform form. The domain does not create a parallel custom-field subsystem.

## Public API boundaries

`apps/api/src/routes/index.js` is the API composition root. It should mount application-owned APIs rather than every reusable capability in the repository.

Generic feature or platform services should not automatically become public CRUD endpoints. When a module needs a shared capability, its domain-owned route should compose that capability internally.

Administrative authorization management is exposed through the canonical `/admin/authorization` API namespace. The authorization permission remains `authorization:manage`; the API namespace and feature boundary do not introduce an `admin:manage` replacement permission.

`apps/api/openapi/openapi.yaml` is the public API contract and should match routes actually exposed by the application.

## Storage and email boundaries

Document features use:

```text
features/documents → platform/storage → infrastructure/storage
```

Application code uses the infrastructure email boundary rather than importing a provider client directly:

```text
application → infrastructure/email → provider
```

Provider selection and provider-specific implementation remain outside business features and modules.

## Event and workflow boundaries

The ownership rule is:

```text
module/feature decides WHY and WHEN
platform decides HOW
infrastructure provides concrete technology
```

A domain must not create a second generic workflow engine. Domain-specific transition definitions belong with the domain while execution remains in the shared platform workflow mechanism.

Event processing and workers must remain domain-neutral.

## Appointments

Appointments are a shared business feature because appointment scheduling is business behavior. A domain may associate an appointment with one of its own entities through a domain-owned service or route without moving domain appointment semantics into the generic feature.

## Domain documentation

Domain-specific documentation is kept outside the general architecture contract:

```text
docs/server/modules/
├── README.md
└── <module>/
    ├── README.md
    └── supporting documents
```

General documentation must not become a catalog of one application's domain workflows. Domain documentation belongs in `docs/server/modules/<module>/`.

## Architectural extension rules

When adding code:

1. Identify whether it is domain-specific, shared business behavior, a reusable mechanism, or a concrete provider.
2. Place it in the corresponding existing layer.
3. Reuse an existing feature or platform mechanism before creating another abstraction.
4. Keep persistence behind repositories.
5. Keep shared layers independent of application modules.
6. Add tests for the behavior and update architecture enforcement when a new enforceable boundary is introduced.
7. Document stable architectural changes here; document domain behavior under `docs/server/modules/<module>/`.

## Anti-patterns

Do not introduce:

```text
apps/api/src/domains/
apps/api/src/core/
apps/api/src/application/
apps/api/src/adapters/
apps/api/src/platform/<specific-domain>/
apps/api/src/features/<specific-domain>/
```

Also avoid direct Prisma access from services, domain-specific rules in platform services, shared features importing modules, infrastructure importing modules, generic JSON/custom fields for stable relationships, generic public CRUD routes for internal capabilities, provider-specific clients in business code, and placeholder domain documentation.
