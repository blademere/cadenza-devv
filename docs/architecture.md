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

`common/`, `config/`, and `routes/` support the application boundary. They are not additional business-architecture layers.

## Layer responsibilities

### `src/modules/`

Modules own domain terminology, domain validation, domain workflows and policies, domain-specific persistence through repositories, and domain-owned API composition.

Modules may depend on shared features and platform services. Shared layers must never import a module. Create a module only when its domain is actually implemented; do not create placeholders or duplicate shared capabilities inside a module.

### `src/features/`

Features are reusable business capabilities that can support multiple application modules. Current examples include people, cases, participants, requirements, tasks, appointments, authentication, users, documents, notifications, and audit.

Features must remain domain-neutral. Appointments are a business feature: availability, slots, capacity, booking, and appointment lifecycle belong here. Generic background scheduling is a platform mechanism and is not the appointment implementation.

### `src/platform/`

Platform provides reusable mechanisms such as authorization, workflow, forms, configurable custom fields, rules, event/outbox infrastructure, jobs, generic scheduling primitives, notification mechanisms, and storage boundaries.

Platform code must be provider-neutral and domain-neutral. It provides mechanisms, not application-specific business decisions.

### `src/infrastructure/`

Infrastructure contains concrete technology integrations and persistence implementations such as PostgreSQL/Prisma, Redis, BullMQ, Resend, OAuth providers, object storage, and monitoring providers. Infrastructure must not contain application-domain business rules or import application modules.

## Mandatory dependency rules

1. Shared `features` must not import `modules`.
2. `platform` must not import `modules`.
3. `infrastructure` must not import `modules`.
4. Domain-specific behavior belongs in `modules`, not `platform`.
5. Services must not query Prisma directly when a repository boundary exists.
6. Repositories own persistence queries and persistence-specific composition.
7. Do not introduce `domains/`, `core/`, `application/`, `adapters/`, or another parallel architecture layer.

The architecture validator enforces these boundaries where they can be checked statically.

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

A service should not call `getPrismaClient()`, `prisma.$transaction()`, or Prisma models directly when the operation belongs to its repository. Transactions spanning multiple repository operations should be coordinated through an appropriate application/repository boundary rather than leaking Prisma into business services.

Repositories may access Prisma because persistence is their responsibility.

## Shared business modeling

Use relational models for stable concepts such as identity, cases, participants, requirements, tasks, lifecycle state, and stable business relationships. Use dynamic forms and configurable custom fields for genuinely variable, configuration-driven attributes.

Dynamic data must not replace strongly modeled relationships merely to avoid schema design.

## Forms and custom fields

Forms provide the reusable mechanism for configuration-driven data capture. Custom fields are part of that mechanism rather than a separate application layer.

The platform owns generic form behavior such as field definitions, validation metadata, field types, ordering, and configurable values. A module or feature owns the meaning of those fields in its business context.

## Public API boundaries

`src/routes/index.js` is the API composition root. It should mount application-owned APIs rather than every reusable capability in the repository.

Generic feature or platform services should not automatically become public CRUD endpoints. When a module needs a shared capability, its domain-owned route should compose that capability internally.

`docs/openapi.yaml` is the public API contract and should match routes actually exposed by the application.

## Storage and email boundaries

Document features use:

```text
features/documents → platform/storage → infrastructure/storage
```

Application code uses the infrastructure email boundary rather than importing a provider client directly:

```text
application → infrastructure/email → Resend
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
docs/modules/
├── README.md
└── <module>/
    ├── README.md
    └── supporting documents
```

General documentation must not become a catalog of one application's domain workflows. Domain documentation belongs in `docs/modules/<module>/`.

## Architectural extension rules

When adding code:

1. Identify whether it is domain-specific, shared business behavior, a reusable mechanism, or a concrete provider.
2. Place it in the corresponding existing layer.
3. Reuse an existing feature or platform mechanism before creating another abstraction.
4. Keep persistence behind repositories.
5. Keep shared layers independent of application modules.
6. Add tests for the behavior and update architecture enforcement when a new enforceable boundary is introduced.
7. Document stable architectural changes here; document domain behavior under `docs/modules/<module>/`.

## Anti-patterns

Do not introduce:

```text
src/domains/
src/core/
src/application/
src/adapters/
src/platform/<specific-domain>/
src/features/<specific-domain>/
```

Also avoid direct Prisma access from services, domain-specific rules in platform services, shared features importing modules, infrastructure importing modules, generic JSON/custom fields for stable relationships, generic public CRUD routes for internal capabilities, provider-specific clients in business code, and placeholder domain documentation.
