# Application Architecture

This document describes the architecture the repository is converging on. It is intentionally separate from the README: the README documents observable application behavior, while this document defines the boundaries that new code must respect.

## Goals

The repository is a reusable backend foundation for multiple applications. The architecture should make it possible to add a domain module without moving domain rules into shared infrastructure or creating another application-wide layer.

The target shape is:

```text
                    ┌──────────────────────┐
                    │       modules/       │
                    │ application domains  │
                    └──────────┬───────────┘
                               │ uses
                    ┌──────────▼───────────┐
                    │       features/      │
                    │ shared business      │
                    │ capabilities         │
                    └──────────┬───────────┘
                               │ uses
                    ┌──────────▼───────────┐
                    │       platform/      │
                    │ reusable engines     │
                    └──────────┬───────────┘
                               │ uses
                    ┌──────────▼───────────┐
                    │   infrastructure/    │
                    │ technical adapters   │
                    └──────────────────────┘
```

`common/`, `config/`, and `routes/` support the application boundary but are not additional business-architecture layers.

## Layer responsibilities

### `src/modules/` — application domains

Modules contain business-specific functionality for a particular application or product.

Examples that may eventually live here:

```text
src/modules/
└── obo/
    ├── permit-types/
    ├── professionals/
    ├── receiving/
    └── inspections/
```

A module owns domain concepts, domain-specific validation, workflows, policies, and persistence that are meaningful only to that domain.

Modules may depend on shared features and platform services. Shared layers must never import a module.

Do not create module placeholders merely to reserve future names. A module should be added when its domain is actually being implemented.

### `src/features/` — shared business capabilities

Features are reusable business primitives that can support multiple modules without being tied to one product domain.

Current foundations include:

```text
people/
cases/
participants/
requirements/
tasks/
```

Existing reusable application features also include authentication, users, appointments, documents, notifications, and audit.

Feature services contain business behavior for that shared capability. Database access belongs in feature repositories rather than being scattered through services.

A feature should not know that an OBO permit, rental agreement, enrollment, or another domain exists.

### `src/platform/` — reusable engines

Platform code provides generic mechanisms used by features and modules.

Examples include:

- authorization
- approvals
- workflow
- forms
- custom fields
- rules
- event bus
- jobs and scheduling
- notifications infrastructure
- document/storage abstractions
- dashboards
- integrations
- configuration
- search and caching infrastructure

Platform services should be provider-neutral and domain-neutral. They expose mechanisms, not application-specific business decisions.

For example, the platform may provide a workflow engine, but `platform/` must not contain a `permitInspectionWorkflow` implementation.

### `src/infrastructure/` — technical adapters

Infrastructure contains concrete technology integrations such as:

- PostgreSQL/Prisma
- Redis
- BullMQ
- email providers
- OAuth providers
- object storage
- monitoring

Infrastructure code should not contain business rules. Providers and persistence details are hidden behind the platform/feature boundary where practical.

## Dependency direction

The intended dependency direction is:

```text
modules → features → platform → infrastructure
```

Supporting application code may depend downward according to its responsibility, but the following rules are mandatory:

1. `platform` must not import `modules`.
2. Shared `features` must not import `modules`.
3. Domain modules must not be implemented inside `platform`.
4. Services should not bypass their feature repositories to query Prisma directly.
5. Infrastructure must not import application-domain modules.
6. Do not introduce `domains/`, `core/`, `application/`, `adapters/`, or another parallel architecture layer to solve a local problem.

## Service/repository boundary

Persistence follows this pattern:

```text
controller / route
        ↓
feature or module service
        ↓
repository
        ↓
Prisma / infrastructure
```

Services own validation and business decisions. Repositories own persistence queries and persistence-specific composition.

This boundary is especially important for shared features because it keeps unit tests deterministic and prevents Prisma details from leaking into business logic.

## Shared business primitives

The Phase 2 foundations are intentionally small.

### Person

`Person` represents a real-world identity. It is not synonymous with an authenticated `User` account.

A person may have a user account, but a person can also exist without login credentials.

### Case

`Case` is a generic record representing an application/work item that moves through a lifecycle. `CaseType` describes the kind of case without embedding a specific domain.

Status changes are recorded as history and must be concurrency-safe.

### Participant

`CaseParticipant` associates a person with a case using a normalized role key. Roles are intentionally extensible rather than hard-coded to one domain.

### Requirement

Requirement definitions describe reusable requirements. `CaseRequirement` records which requirements apply to a particular case and their current state.

Requirements should not be turned into a generic document-upload system. Existing document capabilities remain separate.

### Task

Tasks represent work that can be associated with a case or used independently. Task lifecycle rules remain generic.

## Dynamic data and forms

Dynamic fields are for data that is genuinely variable across configurations or domains. They are not a replacement for core relational data.

Use normal columns/relations for concepts such as:

- person identity
- case relationships
- participant relationships
- case status
- permit type
- professional registration
- workflow state

Use platform custom fields/forms for variable attributes such as configurable classifications, optional measurements, or organization-specific metadata.

This distinction is important for the future permit system: dynamic permit forms can coexist with strongly modeled permit/application relationships.

## Domain modules and OBO

The eventual OBO implementation should be a module, not a collection of permit-specific features scattered through the repository.

Conceptually:

```text
modules/obo/
├── permit-types/
├── professionals/
├── applications/
├── receiving/
└── inspections/
        │
        ├── people
        ├── cases
        ├── participants
        ├── requirements
        ├── tasks
        ├── appointments
        ├── documents
        └── platform engines
```

The OBO module may define permit-specific concepts such as permit types, scopes of work, professional registration, inspection decisions, and application rules.

The shared layers must remain unaware that those concepts exist.

Professional signing is intentionally outside the application workflow. Physical signing of hardcopy documents is a business/offline process and should not be modeled as an application signing feature unless requirements change.

## Platform integration strategy

Phase 3 connects the shared foundations to existing platform capabilities without moving domain logic into the platform.

Typical flow:

```text
Module/service action
      │
      ├── shared feature operation
      │
      ├── transactional event outbox
      │
      ├── audit event
      │
      ├── notification
      │
      └── workflow/rule evaluation
```

The platform supplies mechanisms for these concerns. The module or feature decides when and why they are used.

Business events that describe a persisted state change should be queued in the same database transaction as that change. The platform worker is responsible for generic outbox delivery, rule evaluation, notifications, and stale lease recovery; it must not contain domain-specific maintenance logic.

Deferred capabilities such as SLA, approvals, and webhooks are not implicit event-bus side effects. They remain reusable platform mechanisms until a real feature or module explicitly integrates them.

See [platform-integration.md](platform-integration.md) for the canonical integration pattern.

## Roadmap

### Phase 1 — architecture cleanup

Completed:

- authorization moved to `platform/authorization`
- dependency direction established
- existing features preserved
- no new parallel architectural layers

### Phase 2 — shared business foundations

Completed:

- people
- cases
- participants
- requirements
- tasks
- repository boundaries
- lifecycle hardening and tests

### Phase 3 — platform integration

In progress:

- connect shared business actions to audit/event infrastructure
- establish transactional event publication from shared repositories
- keep event processing and workers domain-neutral
- integrate workflow/rules, appointments, documents, notifications, jobs, and scheduler through explicit feature/module usage rather than hidden platform coupling
- establish consistent module integration patterns

Current Phase 3 implementation provides the transactional case event pattern and a domain-neutral event worker. Remaining feature integrations can follow this pattern as concrete reuse requirements arise.

### Phase 4 — domain modules

Later:

- implement actual application domains
- start with the domain that has a real business requirement
- avoid placeholder modules

For the OBO application, permit-specific functionality belongs under `modules/obo/` and should reuse the shared foundations rather than redefining them.

## Architectural anti-patterns

Avoid:

```text
platform/obo/
features/permit/
domains/
core/
application/
adapters/
```

when these directories merely duplicate responsibilities already defined by the architecture.

Also avoid:

- direct Prisma queries from services when a repository exists
- putting permit-specific statuses into generic case/task enums
- putting every variable field into JSON/custom fields
- creating generic abstractions before a real reuse case exists
- coupling shared features to one application's terminology
- creating future-domain placeholders with no implementation

## Definition of done for a new module

A new domain module should:

1. Have a real business purpose.
2. Own domain-specific rules and terminology.
3. Reuse existing shared features where appropriate.
4. Use platform engines through stable interfaces.
5. Keep persistence behind repositories.
6. Avoid changing generic primitives for domain-only requirements unless the primitive is genuinely reusable.
7. Include unit/integration coverage for its business rules.
8. Document any new architectural dependency or boundary.
