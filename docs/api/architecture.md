# Application Architecture

This document is the authoritative architectural contract for the repository. It defines stable layer responsibilities, dependency direction, persistence boundaries, API ownership, authorization ownership, and rules for extending the application.

## Dependency direction

```text
modules → features → platform → infrastructure
```

- `modules` contain application/domain-specific behavior and own their public API boundaries.
- `features` contain reusable business capabilities and are normally route-less.
- `platform` contains reusable engines and mechanisms.
- `infrastructure` contains concrete technical providers and persistence.

`common/`, `config/`, and `routes/` support the API application boundary. They are not additional business-architecture layers.

## Layer responsibilities

### `apps/api/src/apps/`

Modules own domain terminology, domain validation, domain workflows and policies, domain-specific persistence through repositories, domain-owned API composition, and domain-owned authorization policy administration.

Modules may depend on shared features and platform services. Shared layers must never import a module. Create a module only when its domain is actually implemented; do not create placeholders or duplicate shared capabilities inside a module.

A module is the HTTP/API boundary for its own domain. Module routes/controllers may compose reusable feature services and platform mechanisms, but the module owns the endpoint, request contract, domain authorization policy, and orchestration exposed through that endpoint.

Authorization is scoped to the module that owns the domain. A module may define and administer its own roles, permissions, resource policies, and authorization vocabulary while using `platform/authorization` as the shared enforcement mechanism. Authorization must not be treated as one global domain model merely because the enforcement engine is shared.

### `apps/api/src/features/`

Features are reusable business capabilities that can support multiple application modules. Current examples include people, cases, participants, requirements, tasks, appointments, authentication, users, documents, and notifications.

Features must remain domain-neutral and normally have no HTTP routes or controllers. A feature exposes reusable services, repositories, validation, and supporting business capability to modules. A feature must not become a second public API merely because its service is reusable.

The application boundary should therefore follow:

```text
HTTP request
    ↓
module route/controller
    ↓
module service
    ↓
reusable feature service
    ↓
platform / infrastructure
```

The authentication feature is an explicit exception to the route-less rule because authentication establishes the application's identity/session boundary. Authentication may own authentication-specific middleware and endpoints required to establish or terminate authenticated sessions. This exception does not grant other features permission to expose their own APIs.

Reusable features are not moved into `platform` merely because they are shared. People, cases, requirements, tasks, appointments, documents, and similar capabilities remain features when they represent reusable business behavior. Platform is reserved for domain-neutral mechanisms.

### `apps/api/src/platform/`

Platform provides reusable mechanisms such as authorization, workflow, forms, configurable custom fields, rules, event/outbox infrastructure, jobs, generic scheduling primitives, notification mechanisms, configuration, and storage boundaries.

Platform code must be provider-neutral and domain-neutral. It provides mechanisms, not application-specific business decisions.

`platform/authorization` is the shared authorization enforcement mechanism. It owns permission evaluation infrastructure, authorization middleware, resource-authorization primitives, authorization context, enforcement, and authorization-related caching. It does not own application-domain roles, permissions, or module policy administration.

The intended relationship is:

```text
module authorization policy
          │
          ▼
platform/authorization
          │
          ▼
authorization engine
```

The module owns the meaning and administration of its authorization model. The platform supplies the reusable mechanism for evaluating and enforcing that model.

### `apps/api/src/infrastructure/`

Infrastructure contains concrete technology integrations and persistence implementations such as PostgreSQL/Prisma, Redis, BullMQ, Resend, OAuth providers, object storage, and monitoring providers. Infrastructure must not contain application-domain business rules or import application modules.

## Mandatory dependency rules

1. Shared `features` must not import `modules`.
2. `platform` must not import `modules` or feature implementations.
3. `infrastructure` must not import `modules`.
4. `common` must not import `features`, `platform`, or `modules`.
5. Domain-specific behavior belongs in `modules`, not `platform`.
6. Module-specific authorization behavior belongs in the owning `module`; shared authorization enforcement belongs in `platform/authorization`.
7. Features are route-less by default and must not expose public HTTP APIs through feature route/controller files.
8. Authentication is the explicit feature exception for authentication-specific HTTP endpoints and middleware.
9. A module may consume feature services but must not depend on feature HTTP routes/controllers.
10. Services must not query Prisma directly when a repository boundary exists.
11. New platform services must use repositories rather than direct Prisma access.
12. Repositories own persistence queries and persistence-specific composition.
13. Do not introduce `domains/`, `core/`, `application/`, `adapters/`, or another parallel architecture layer.
14. Platform-owned configuration must be consumed through `platform/configuration`; domain-specific configuration remains owned by the domain/module.

The architecture validator must enforce these boundaries where they can be checked statically. See [`docs/api/platform/architecture-rules.md`](platform/architecture-rules.md) for the detailed enforcement contract and tracked legacy exceptions.

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

## Platform persistence migration rule

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

Platform configuration must remain generic. It may contain system, operational, and platform mechanism settings, but must not encode domain rules. Domain-specific configuration remains owned by the relevant module or feature.

Do not introduce a database-backed configuration store unless the application requires runtime-managed, tenant-scoped, versioned, or transactional settings. If persistence becomes necessary, keep it behind a configuration repository.

## Platform documentation

The platform capability contracts are maintained under `docs/api/platform/`.

## Shared business modeling

Use relational models for stable concepts such as identity, cases, participants, requirements, tasks, lifecycle state, and stable business relationships. Use dynamic forms and configurable custom fields for genuinely variable, configuration-driven attributes.

Dynamic data must not replace strongly modeled relationships merely to avoid schema design.

## Forms and custom fields

Forms provide the reusable mechanism for configuration-driven data capture. Custom fields are part of that mechanism rather than a separate application layer.

The platform owns generic form behavior such as field definitions, validation metadata, field types, ordering, options, visibility, submissions, and versioning. A module or feature owns the meaning of those fields in its business context.

For domain-specific forms, the module associates its business entity with a platform form. The domain does not create a parallel custom-field subsystem.

## Public API boundaries

`apps/api/src/routes/index.js` is the API composition root. It should mount application-owned module APIs and the explicit authentication boundary rather than every reusable capability in the repository.

Generic feature or platform services should not automatically become public CRUD endpoints. When a module needs a shared capability, its domain-owned route should compose that capability internally.

Module APIs must own their endpoint paths, request/response contracts, domain-specific validation, and authorization policies. Shared feature services must not require consumers to mount feature routes in order to use the capability.

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

Appointments are a shared business feature because appointment scheduling is business behavior. A module may associate an appointment with one of its own entities through a module-owned service or route without moving domain appointment semantics into the generic feature.

The appointment feature does not need to expose its own HTTP API for modules to use appointment scheduling.

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
6. Put public HTTP endpoints in modules, except for the explicit authentication boundary.
7. Keep authorization policy ownership inside the module that owns the domain; reuse `platform/authorization` for enforcement.
8. Add tests for the behavior and update architecture enforcement when a new enforceable boundary is introduced.
9. Document stable architectural changes here; document domain behavior under `docs/server/modules/<module>/`.

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

Also avoid direct Prisma access from services, domain-specific rules in platform services, shared features importing modules, infrastructure importing modules, feature-owned public CRUD APIs, feature route registration outside the explicit authentication boundary, global authorization policy models that erase module ownership, generic JSON/custom fields for stable relationships, provider-specific clients in business code, and placeholder domain documentation.
