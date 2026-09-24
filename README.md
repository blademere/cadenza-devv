# Express App

A CommonJS Express 5 API foundation using PostgreSQL/Prisma, Redis, authentication, authorization, shared business capabilities, and reusable platform services.

This README is the formal entry point for the repository. It describes the current application and engineering surface. API architecture rules live in [`docs/api/architecture.md`](docs/api/architecture.md). Domain-specific documentation lives under [`docs/api/modules/`](docs/api/modules/).

## Current capabilities

- Password authentication with JWT access and refresh-token rotation.
- Google and Facebook OAuth, including account linking and unlinking.
- Permission-based authorization with Redis-backed permission caching.
- User listing and creation APIs.
- Shared appointment scheduling and appointment lifecycle operations.
- Shared people, cases, participants, requirements, and tasks capabilities.
- Dynamic forms and configurable custom fields for genuinely variable data.
- Reusable document, notification, audit, workflow, event, storage, queue, and related platform capabilities.
- OBO plan-permit application workflows under `apps/api/src/apps/obo/`.
- Cadenza application code under `apps/api/src/apps/cadenza/`.
- PostgreSQL persistence through Prisma and Redis-backed infrastructure.
- OpenAPI/Swagger documentation outside production.
- Health, readiness, liveness, metrics, logging, and monitoring support.

## API

The API composition root is `apps/api/src/routes/index.js`. The current API mounts:

```text
/api/v1/auth
/api/v1/users
/api/v1/admin/authorization
/api/v1/appointments
/api/v1/audit
/api/v1/obo
```

The authorization administration API is an administrative capability under the `admin` feature boundary. The authorization capability itself remains a platform concern. The management permission remains `authorization:manage`.

Appointments, audit, and other reusable capabilities are exposed only where the current API composition explicitly mounts them. Reusable internal services are not automatically public API roots.

Operational endpoints are mounted by the API application:

```text
GET /health
GET /health/live
GET /health/ready
GET /metrics
GET /docs        # non-production
```

The OpenAPI contract is [`apps/api/openapi/openapi.yaml`](apps/api/openapi/openapi.yaml).

## Architecture

The repository follows this dependency direction:

```text
apps → features → platform → infrastructure
```

- `apps` contain application/domain-specific behavior and own application boundaries.
- `features` contain reusable business capabilities and API-facing capabilities that are explicitly composed by the API.
- `platform` contains reusable engines and mechanisms.
- `infrastructure` contains concrete technical adapters/providers and persistence.

The API applications live under `apps/api/src/apps/`. Each app owns its domain-specific workflows, validation, policies, persistence orchestration, and application-facing API composition.

The `admin` directory is an administrative feature boundary. Administrative capabilities can orchestrate shared features and platform services, but domain business rules remain owned by the relevant app or feature.

Authorization follows the same separation:

```text
app / feature authorization policy
              ↓
platform/authorization
              ↓
shared authorization enforcement
```

Application and feature code owns authorization policy and meaning where appropriate. `platform/authorization` provides reusable enforcement mechanisms and authorization infrastructure.

See [`docs/api/architecture.md`](docs/api/architecture.md) for the complete architectural contract.

## Repository structure

```text
apps/
├─ api/
│  ├─ prisma/                # API-owned Prisma schema and migrations
│  ├─ src/
│  │  ├─ common/             # Cross-cutting HTTP and utility helpers
│  │  ├─ config/              # API configuration
│  │  ├─ features/            # Reusable business capabilities and API-facing features
│  │  │  └─ admin/             # Administrative feature boundary
│  │  ├─ apps/                # Application/domain boundaries
│  │  │  ├─ cadenza/
│  │  │  └─ obo/
│  │  ├─ platform/            # Reusable engines and mechanisms
│  │  ├─ infrastructure/      # Technical adapters/providers
│  │  └─ routes/               # API composition
│  ├─ tests/                   # Unit and integration tests
│  ├─ openapi/                 # API-owned public contract
│  └─ package.json             # @express-app/api workspace
├─ web/                        # React/Vite frontend application
└─ obo-web/                    # React/Vite/Mantine OBO application

docs/api/                     # API architecture and engineering documentation
scripts/                       # Monorepo/project utilities
packages/                      # Shared contracts/code when needed
package.json                   # npm workspace orchestration
package-lock.json              # Single repository lockfile
```

Prisma schema, database migrations, database scripts, and OpenAPI tooling are API-workspace concerns owned by `apps/api`. The other applications do not own the API database schema.

The OBO frontend is the OBO application. Authorization administration is one permission-controlled capability within OBO Web, not the application's identity.

## Dynamic forms

Forms and custom fields are part of the reusable form capability. Use relational models for stable concepts such as identity, relationships, lifecycle state, and other core entities. Use forms/custom fields for genuinely configurable attributes.

OBO permit types associate with the generic Forms platform through `formId`; permit-specific configurable fields belong to those forms rather than to a separate custom-field subsystem.

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

`npm run dev` starts the API and Vite web application. To start an individual workspace, use the workspace-owned command, for example `npm --workspace @express-app/api run dev` or `npm --workspace @express-app/obo-web run dev`. If you start the web application separately, the API must already be running on port `3000` (or the URL configured by `VITE_API_PROXY_TARGET`).

The browser-facing API base remains `/api/v1` for same-origin development so authentication cookies remain associated with the browser's web origin while Vite proxies API requests to Express.

Quality checks:

```bash
npm run lint
npm run format:check
npm run validate:architecture
npm run validate:migrations
```

Tests:

```bash
npm --workspace @express-app/api run test
npm --workspace @express-app/obo-web run test
```

Never commit production secrets. Keep `.env.example` as the configuration template.

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/api/architecture.md`](docs/api/architecture.md) | Stable API architecture and dependency contract |
| [`docs/api/modules/`](docs/api/modules/) | Domain-specific API documentation |
| [`docs/api/dynamic-forms.md`](docs/api/dynamic-forms.md) | Reusable dynamic forms and configurable fields |
| [`docs/api/event-infrastructure.md`](docs/api/event-infrastructure.md) | Event/outbox infrastructure |
| [`docs/api/workflow-engine.md`](docs/api/workflow-engine.md) | Generic workflow/versioning mechanism |
| [`docs/api/enforcement-contracts.md`](docs/api/enforcement-contracts.md) | Enforceable repository contracts |
| [`docs/api/security/security-and-api-contracts.md`](docs/api/security/security-and-api-contracts.md) | Security and API contracts |
| [`apps/api/openapi/openapi.yaml`](apps/api/openapi/openapi.yaml) | Public API contract |

General documentation describes current implementation and stable engineering contracts. Domain workflows and domain-specific requirements belong under `docs/api/modules/<module>/`.