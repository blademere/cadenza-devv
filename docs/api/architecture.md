# Application Architecture

This document is the authoritative architectural contract for the repository. It defines the current layer responsibilities, dependency direction, persistence boundaries, API ownership, authorization ownership, and rules for extending the application.

## Dependency direction

```text
apps → features → platform → infrastructure
```

- `apps` contain application/domain-specific behavior and own application boundaries.
- `features` contain reusable business capabilities and may expose API endpoints when the capability is explicitly part of the API surface.
- `platform` contains reusable engines and mechanisms.
- `infrastructure` contains concrete technical providers and persistence.

`common/`, `config/`, and `routes/` support the API application boundary. They are supporting API infrastructure rather than additional business-architecture layers.

The API application directory is `apps/api/src/apps/`. Current applications include `cadenza` and `obo`.

## Layer responsibilities

### `apps/api/src/apps/`

Apps own application-specific domain terminology, domain validation, domain workflows and policies, domain-specific persistence orchestration, and application API composition.

Apps may depend on shared features and platform services. Shared layers must not import an app. Create an app when there is a distinct application/domain boundary that needs its own orchestration, policies, or API composition.

An app owns the API boundary for its domain when that domain exposes app-owned endpoints. App routes/controllers may compose reusable feature services and platform mechanisms, but the app owns the endpoint contract, domain validation, orchestration, and domain-specific authorization policy.

Application authorization policy belongs to the app that owns the domain. The app may use `platform/authorization` for shared enforcement, authorization context, middleware, and resource-authorization mechanisms.

### `apps/api/src/features/`

Features are reusable business capabilities that can support multiple applications or be exposed directly as an explicit API capability. Current feature boundaries include admin, appointments, auth, cases, documents, notifications, participants, people, requirements, tasks, and users.

A feature owns its business behavior, validation, repositories, services, and—when the current API exposes that capability directly—its controllers and routes. The existence of a feature route does not make the feature a separate application; API composition remains explicit in `apps/api/src/routes/`.

The current composition therefore follows either of these valid patterns:

```text
HTTP request
    ↓
app route/controller
    ↓
app service
    ↓
feature service
    ↓
platform / infrastructure
```

or, for an explicitly API-facing feature:

```text
HTTP request
    ↓
feature route/controller
    ↓
feature service
    ↓
platform / infrastructure
```

The `auth`, `users`, `appointments`, and `admin/authorization` features currently participate directly in the API composition. Reusable feature services remain usable internally without requiring a public endpoint.

People, cases, participants, requirements, tasks, appointments, documents, users, and similar capabilities remain features when they represent reusable business behavior. They do not belong in `platform` merely because more than one app can use them.

### `apps/api/src/platform/`

Platform provides reusable, domain-neutral mechanisms such as authorization, workflow, forms, configurable custom fields, rules, event/outbox infrastructure, jobs, generic scheduling primitives, notification mechanisms, context, configuration, and storage boundaries.

Platform code must remain domain-neutral. It provides mechanisms and enforcement primitives, not application-specific business decisions.

`platform/authorization` is the shared authorization enforcement mechanism. It provides authorization context, permission evaluation, middleware, resource-authorization primitives, enforcement, and related caching. It does not define the business meaning of an application's roles, permissions, or resource policies.

The intended relationship is:

```text
app / feature authorization policy
              │
              ▼
platform/authorization
              │
              ▼
shared authorization enforcement
```

The application or feature owns the meaning and administration of its authorization model. The platform supplies the reusable mechanism for evaluating and enforcing that model.

### `apps/api/src/infrastructure/`

Infrastructure contains concrete technology integrations and persistence implementations such as PostgreSQL/Prisma, Redis, BullMQ, Resend, OAuth providers, object storage, and monitoring providers. Infrastructure must not contain application-domain business rules or import apps.

## Mandatory dependency rules

1. Shared `features` must not import `apps`.
2. `platform` must not import `apps` or feature implementations.
3. `infrastructure` must not import `apps`.
4. `common` must not import `features`, `platform`, or `apps`.
5. Domain-specific application behavior belongs in `apps`.
6. Shared business capabilities belong in `features`.
7. Domain-neutral mechanisms belong in `platform`.
8. App-specific authorization policy belongs to the owning app; shared authorization enforcement belongs in `platform/authorization`.
9. Feature routes are allowed only when that feature is an explicit API capability; API composition must remain explicit in `apps/api/src/routes/`.
10. Apps may consume feature services but should not depend on another feature's route registration.
11. Services must not query Prisma directly when a repository boundary exists.
12. New platform services must use repositories rather than direct Prisma access.
13. Repositories own persistence queries and persistence-specific composition.
14. Do not introduce `domains/`, `core/`, `application/`, `adapters/`, or another parallel architecture layer.
15. Platform-owned configuration must be consumed through `platform/configuration`; domain-specific configuration remains owned by the relevant app or feature.

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

A service should not call `getPrismaClient()`, `prisma.$transaction()`, or Prisma models directly when the operation belongs to its repository. Transactions spanning multiple repository operations should be coordinated through an explicit transaction boundary without exposing Prisma to business services.

Repositories may access Prisma because persistence is their responsibility.

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

Platform configuration must remain generic. It may contain system, operational, and platform mechanism settings, but must not encode domain rules. Domain-specific configuration remains owned by the relevant app or feature.

Do not introduce a database-backed configuration store unless the application requires runtime-managed, tenant-scoped, versioned, or transactional settings. If persistence becomes necessary, keep it behind a configuration repository.

## Platform documentation

Platform capability contracts are maintained under `docs/api/platform/`.

## Shared business modeling

Use relational models for stable concepts such as identity, cases, participants, requirements, tasks, lifecycle state, and stable business relationships. Use dynamic forms and configurable custom fields for genuinely variable, configuration-driven attributes.

Dynamic data must not replace strongly modeled relationships merely to avoid schema design.

## Forms and custom fields

Forms provide the reusable mechanism for configuration-driven data capture. Custom fields are part of that mechanism rather than a separate application layer.

The platform owns generic form behavior such as field definitions, validation metadata, field types, ordering, options, visibility, submissions, and versioning. An app or feature owns the meaning of those fields in its business context.

For domain-specific forms, the app associates its business entity with a platform form. The domain does not create a parallel custom-field subsystem.

## Public API boundaries

`apps/api/src/routes/index.js` is the API composition root. It currently mounts authentication, users, administrative authorization, appointments, audit, authorization-context handling, and OBO application routes.

The public API is mounted under `/api/v1` by `apps/api/src/app.js`.

Generic feature or platform services do not automatically become public CRUD endpoints. When a capability is public, its route is explicitly registered in `apps/api/src/routes/`.

Application APIs own their endpoint paths, request/response contracts, domain-specific validation, and authorization policies. Feature APIs own the same concerns when the feature is intentionally exposed directly.

## Storage and email boundaries

Document features use:

```text
features/documents → platform/storage → infrastructure/storage
```

Application and feature code uses the infrastructure email boundary rather than importing a provider client directly:

```text
application / feature → infrastructure/email → provider
```

Provider selection and provider-specific implementation remain outside business features and apps.

## Event and workflow boundaries

The ownership rule is:

```text
app/feature decides WHY and WHEN
platform decides HOW
infrastructure provides concrete technology
```

A domain must not create a second generic workflow engine. Domain-specific transition definitions belong with the domain while execution remains in the shared platform workflow mechanism.

Event processing and workers should remain domain-neutral unless a worker is explicitly owned by an application or feature.

## Appointments

Appointments are a shared business feature because appointment scheduling is business behavior. The current API explicitly mounts the appointment feature at `/api/v1/appointments`.

Other apps or features may reuse appointment services without creating a second scheduling implementation.

## Domain documentation

Domain-specific API documentation is kept under:

```text
docs/api/modules/
├── README.md
└── <module>/
    ├── README.md
    └── supporting documents
```

The documentation directory describes domain behavior and implementation details. General architecture documentation remains focused on stable repository-wide contracts.

## Architectural extension rules

When adding code:

1. Identify whether it is application-specific behavior, reusable business behavior, a reusable mechanism, or a concrete provider.
2. Place it in the corresponding existing layer.
3. Reuse an existing feature or platform mechanism before creating another abstraction.
4. Keep persistence behind repositories.
5. Put application-specific orchestration and domain policy in the owning app.
6. Put reusable business behavior in features.
7. Put domain-neutral mechanisms in platform.
8. Put public HTTP endpoints in the appropriate app or explicitly API-facing feature and register them through the API composition root.
9. Keep authorization policy ownership with the app or feature that owns the business meaning; reuse `platform/authorization` for enforcement.
10. Add tests for the behavior and update architecture enforcement when a new enforceable boundary is introduced.
11. Document stable architectural changes here; document domain behavior under `docs/api/modules/<module>/`.

## Anti-patterns

Do not introduce:

```text
apps/api/src/domains/
apps/api/src/core/
apps/api/src/application/
apps/api/src/adapters/
apps/api/src/platform/<specific-domain>/
```

Also avoid direct Prisma access from services where a repository boundary exists, domain-specific rules in platform services, shared features importing apps, infrastructure importing apps, unregistered feature endpoints, global authorization policy models that erase app ownership, generic JSON/custom fields for stable relationships, provider-specific clients in business code, and documentation that describes structures not present in the current source tree.
