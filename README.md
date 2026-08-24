# Express App

A CommonJS Express 5 backend foundation using PostgreSQL/Prisma, Redis, authentication, authorization, shared business capabilities, and reusable platform services.

This README is the **formal entry point** for the repository. It describes the current application and engineering surface. Architecture rules live in [`docs/server/architecture.md`](docs/server/architecture.md). Domain-specific documentation lives under [`docs/server/modules/`](docs/server/modules/).

## Current capabilities

- Password authentication with JWT access and refresh-token rotation.
- Google and Facebook OAuth, including account linking and unlinking.
- Permission-based authorization with Redis-backed permission caching.
- User listing and creation APIs.
- Shared appointment scheduling and appointment lifecycle operations.
- Shared people, cases, participants, requirements, and tasks foundations.
- Dynamic forms and configurable custom fields for genuinely variable data.
- Reusable document, notification, audit, workflow, event, storage, queue, and related platform capabilities.
- OBO plan-permit domain workflows under `apps/server/src/modules/obo/`.
- PostgreSQL persistence through Prisma and Redis-backed infrastructure.
- OpenAPI/Swagger documentation outside production.
- Health, readiness, liveness, metrics, logging, and monitoring support.

## API

The API composition root currently mounts:

```text
/api/v1/auth
/api/v1/users
/api/v1/authorization
/api/v1/obo
```

Appointments and other reusable capabilities are not automatically public API roots; they are composed by application routes when required.

Operational endpoints:

```text
GET /health
GET /health/live
GET /health/ready
GET /metrics
GET /docs        # non-production
```

The OpenAPI contract is [`apps/server/openapi/openapi.yaml`](apps/server/openapi/openapi.yaml). Reusable internal capabilities are not automatically exposed as public CRUD APIs.

## Architecture

The repository follows this dependency direction:

```text
modules → features → platform → infrastructure
```

- `modules` contain application/domain-specific behavior.
- `features` contain reusable business capabilities.
- `platform` contains reusable engines and mechanisms.
- `infrastructure` contains concrete technical providers and persistence.

Services use repositories for persistence. Platform and shared features must remain independent of application modules. Do not introduce parallel layers such as `domains/`, `core/`, `application/`, or `adapters/`.

See [`docs/server/architecture.md`](docs/server/architecture.md) for the complete architectural contract.

## Repository structure

```text
apps/
├─ server/
│  ├─ src/
│  │  ├─ common/             # Cross-cutting HTTP and utility helpers
│  │  ├─ config/             # Application configuration
│  │  ├─ features/           # Shared business capabilities
│  │  ├─ platform/           # Reusable engines and mechanisms
│  │  ├─ infrastructure/     # Technical adapters/providers
│  │  ├─ modules/             # Application/domain modules
│  │  └─ routes/              # API composition
│  ├─ tests/                  # Unit and integration tests
│  └─ openapi/                # Server-owned public API contract
└─ web/                       # Future frontend application

prisma/                       # Prisma schema and migrations
docs/server/                  # Server architecture and engineering documentation
scripts/                      # Project and database utilities
packages/                     # Shared contracts/code when needed
```

## Dynamic forms

Forms and custom fields are part of the reusable form capability. Use relational models for stable concepts such as identity, relationships, lifecycle state, and other core entities. Use forms/custom fields for genuinely configurable attributes.

OBO permit types currently associate with the generic Forms platform through `formId`; permit-specific configurable fields belong to those forms rather than to a separate custom-field subsystem. Domain documentation explains how OBO uses the forms capability.

## Development

Requirements:

- Node.js
- PostgreSQL
- Redis

Install dependencies:

```bash
npm install
```

Initialize a development project:

```bash
npm run init
npm run db:setup
npm run dev
```

Quality checks:

```bash
npm run lint
npm run format:check
npm run validate:architecture
npm run validate:migrations
```

Tests:

```bash
npm run test:unit
npm run test:integration
npm run test:all
```

Never commit production secrets. Keep `.env.example` as the configuration template.

## Documentation

| Document | Purpose |
|---|---|
| [`docs/server/architecture.md`](docs/server/architecture.md) | Stable architecture and dependency contract |
| [`docs/server/modules/`](docs/server/modules/) | Domain/module-specific documentation |
| [`docs/server/dynamic-forms.md`](docs/server/dynamic-forms.md) | Reusable dynamic forms and configurable fields |
| [`docs/server/event-infrastructure.md`](docs/server/event-infrastructure.md) | Event/outbox infrastructure |
| [`docs/server/workflow-engine.md`](docs/server/workflow-engine.md) | Generic workflow mechanism |
| [`docs/server/enforcement-contracts.md`](docs/server/enforcement-contracts.md) | Enforceable repository contracts |
| [`docs/server/security/security-and-api-contracts.md`](docs/server/security/security-and-api-contracts.md) | Security and API contracts |
| [`apps/server/openapi/openapi.yaml`](apps/server/openapi/openapi.yaml) | Public API contract |

General documentation describes current implementation and stable engineering contracts. Historical implementation phases and temporary migration plans do not belong in the README or architecture contract. Domain workflows and domain-specific requirements belong under `docs/server/modules/<module>/`.
