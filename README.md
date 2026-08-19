# Express App

A CommonJS Express 5 API with PostgreSQL/Prisma, Redis-backed infrastructure, authentication, OAuth, permission-based access control, shared business foundations, appointments, and reusable platform capabilities.

> **Personal foundation:** This repository is maintained as a reusable backend foundation for my own projects. It intentionally keeps strong opinions about the stack and infrastructure instead of trying to be a generic Express boilerplate for everyone.

> **Architecture:** The repository follows a layered application-platform architecture. See [`docs/architecture.md`](docs/architecture.md) for dependency rules, shared business foundations, module strategy, public API boundaries, and roadmap.

## Implemented features

### Authentication

- Username/password login.
- Short-lived JWT access tokens.
- Refresh-token rotation and replay protection.
- Refresh-token and logout flows protected with CSRF handling.
- Logout and refresh rate limiting.
- Google OAuth sign-in.
- GitHub OAuth sign-in.
- Linking and unlinking Google/GitHub accounts for authenticated users.
- Listing linked OAuth accounts.

Authentication middleware lives under `src/features/auth`; authorization middleware and policy evaluation live under `src/platform/authorization`. Shared middleware no longer owns feature-specific authentication or authorization implementations.

### Access control

- Authentication middleware for protected routes.
- Resource/action authorization middleware.
- Permission checks are evaluated independently per action (for example, `users:read` and `users:create`).
- User-role assignment is restricted so a requester cannot assign permissions they do not possess.
- Permission caching/invalidation is backed by Redis infrastructure.

Authorization is a reusable platform capability under `src/platform/authorization`, while authentication remains a feature under `src/features/auth`.

### Users

The currently exposed user API supports:

- Listing users with pagination.
- Creating users.
- Validation of user input.
- Role-aware authorization for user read/create operations.

The application does **not** currently expose a complete user-management CRUD surface; update/delete and other planned user operations should not be considered implemented features.

### Shared business foundations

Phase 2 established reusable business primitives under `src/features/`:

- `people` — real-world person identity/contact data.
- `cases` — generic case types, case records, and status history.
- `participants` — person-to-case role assignments.
- `requirements` — reusable requirement definitions and case requirements.
- `tasks` — generic work items, optionally associated with a case.

These are intentionally domain-neutral. They do not contain permit-specific behavior.

### Appointments

Appointments are a shared business feature because appointment scheduling is a real business capability rather than generic infrastructure. The current feature provides:

- Appointment types.
- Availability schedules.
- Explicit slot creation and generated slots.
- Slot duration, capacity, and timezone-aware generation.
- Appointment creation and lookup.
- Cancellation, check-in, no-show, and completion actions.
- Permission-based access control for appointment operations.

The slot-generation service is intentionally retained. For the eventual OBO application, appointments represent physical hardcopy submission appointments. They are not the permit application itself and should not be confused with future inspection scheduling.

Until the OBO module is implemented, the reusable appointment feature is mounted at `/api/v1/appointments`. When OBO is introduced, its public API should own the business-facing submission-appointment routes rather than exposing generic appointment CRUD as a domain API.

### Documents and storage

Document functionality remains available as a reusable feature, but its storage dependency is now routed through the platform storage boundary:

```text
features/documents → platform/storage → infrastructure/storage
```

The document feature does not select a local filesystem, S3, or another provider directly. Storage provider registration is performed at the application composition root.

### Email

Resend is the active email provider.

```text
application → infrastructure/email → Resend
```

The old Nodemailer provider implementation has been removed. Provider-specific code remains behind the infrastructure email boundary.

### API and security infrastructure

- Express 5 application structure with feature-oriented modules.
- Zod request validation.
- Consistent JSON API responses and centralized error handling.
- Helmet security headers.
- CORS configuration with credentials support.
- HTTP parameter pollution protection.
- Response compression.
- Global and endpoint-specific rate limiting.
- Request IDs and structured request logging.
- Cookie parsing and secure refresh-token cookie handling.
- OpenAPI/Swagger documentation available at `/docs` outside production.

### Health and observability

- `/health` service health endpoint.
- `/health/live` liveness endpoint.
- `/health/ready` readiness checks for PostgreSQL and Redis.
- Prometheus metrics at `/metrics`, with bearer-token protection when configured.
- Sentry and structured logging integrations are present in the monitoring infrastructure.

### Persistence and infrastructure

- PostgreSQL accessed through Prisma.
- Redis integration for caching and related infrastructure.
- Database migrations managed through Prisma.
- Resend email integration.
- Object-storage adapters for local development and additional providers that may be enabled by configuration.
- BullMQ queue infrastructure and worker entrypoint are present.

These infrastructure integrations should not be interpreted as complete end-user product modules unless they are exposed by the current API/application flow.

## API surface

The currently mounted application API routes are:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Password login |
| `GET` | `/api/v1/auth/oauth/google` | Start Google OAuth |
| `GET` | `/api/v1/auth/oauth/google/callback` | Google OAuth callback |
| `GET` | `/api/v1/auth/oauth/github` | Start GitHub OAuth |
| `GET` | `/api/v1/auth/oauth/github/callback` | GitHub OAuth callback |
| `GET` | `/api/v1/auth/oauth/accounts` | List linked OAuth accounts |
| `GET` | `/api/v1/auth/oauth/link/google` | Start Google account linking |
| `GET` | `/api/v1/auth/oauth/link/github` | Start GitHub account linking |
| `DELETE` | `/api/v1/auth/oauth/link/:provider` | Unlink an OAuth account |
| `POST` | `/api/v1/auth/refresh` | Rotate a refresh token and issue an access token |
| `POST` | `/api/v1/auth/logout` | Log out / revoke the refresh session |
| `GET` | `/api/v1/users` | List users; requires `users:read` |
| `POST` | `/api/v1/users` | Create a user; requires `users:create` |
| `GET` | `/api/v1/appointments/types` | List appointment types |
| `POST` | `/api/v1/appointments/types` | Create an appointment type; requires appointment management permission |
| `POST` | `/api/v1/appointments/schedules` | Create an availability schedule |
| `POST` | `/api/v1/appointments/slots` | Create an explicit slot |
| `POST` | `/api/v1/appointments/slots/generate` | Generate appointment slots from a schedule |
| `GET` | `/api/v1/appointments/slots` | List appointment slots |
| `GET` | `/api/v1/appointments/mine` | List the authenticated user's appointments |
| `POST` | `/api/v1/appointments` | Create an appointment |
| `GET` | `/api/v1/appointments/:id` | Get the authenticated user's appointment |
| `POST` | `/api/v1/appointments/:id/cancel` | Cancel an appointment |
| `POST` | `/api/v1/appointments/:id/check-in` | Check in an appointment |
| `POST` | `/api/v1/appointments/:id/no-show` | Mark an appointment as no-show |
| `POST` | `/api/v1/appointments/:id/complete` | Complete an appointment |

The generic document, notification, and audit-log feature routers are intentionally **not** mounted as public API roots. Those capabilities remain available internally and should be exposed through a domain-owned API when a real application module needs them.

Operational endpoints:

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /docs` (non-production)

The shared business foundations are reusable services rather than generic public CRUD APIs. Domain modules will expose application-specific endpoints when they are implemented.

## Project structure

```text
src/
├─ common/                 # Cross-cutting HTTP/middleware/error/utility helpers
├─ config/                 # Environment, logging, and application configuration
├─ features/               # Shared business/application capabilities
│  ├─ appointments/        # Appointment types, schedules, slots, and booking
│  ├─ audit/               # Audit feature
│  ├─ auth/                # Password auth, JWT/refresh tokens, OAuth, authentication middleware
│  ├─ cases/               # Generic case foundation
│  ├─ documents/           # Document feature
│  ├─ notifications/       # Notification feature
│  ├─ participants/        # Case/person participation
│  ├─ people/              # Real-world person identity
│  ├─ requirements/        # Reusable case requirements
│  ├─ tasks/               # Generic work items
│  └─ users/                # User API and user services
├─ platform/               # Reusable engines/mechanisms
│  ├─ authorization/       # Generic authorization engine and middleware
│  ├─ approvals/           # Deferred approval mechanisms
│  ├─ forms/               # Dynamic form mechanisms
│  ├─ custom-fields/       # Configurable metadata fields
│  ├─ event-bus/           # Generic domain event dispatching
│  ├─ jobs/                # Background job primitives
│  ├─ notifications/       # Notification infrastructure
│  ├─ rules/               # Generic rule evaluation
│  ├─ scheduler/           # Deferred generic job scheduling primitives
│  ├─ search/              # Deferred provider-neutral search abstraction
│  └─ ...                  # Other reusable platform engines
├─ infrastructure/         # Concrete technical adapters/providers
│  ├─ cache/               # Redis
│  ├─ database/            # Prisma/PostgreSQL
│  ├─ email/               # Resend boundary/provider
│  ├─ monitoring/           # Metrics/logging/observability
│  ├─ oauth/               # OAuth provider integrations
│  ├─ queue/               # BullMQ
│  └─ storage/              # Object storage providers
├─ routes/                 # API route mounting/composition
└─ server.js               # Application entrypoint

src/modules/               # Future domain modules; added only when a real domain is implemented

prisma/                    # Schema and migrations
docs/                      # Architecture, API, and platform documentation
tests/                     # Unit and integration tests
scripts/                   # Database and project utilities
```

### Dependency direction

The intended dependency direction is:

```text
modules → features → platform → infrastructure
```

The important boundary rules are:

- `platform` must not import `modules`.
- Shared `features` must not import `modules`.
- Domain-specific behavior belongs in `modules`, not `platform`.
- Services should access persistence through repositories rather than querying Prisma directly.
- Do not introduce parallel layers such as `domains/`, `core/`, `application/`, or `adapters/`.

See [`docs/architecture.md`](docs/architecture.md) for the complete rules.

## Dynamic data and domain modeling

The platform supports dynamic forms and custom fields, but dynamic data is not a replacement for core relational modeling.

Use normal columns and relations for concepts such as identity, case relationships, participants, workflow state, permit type, and professional registration. Use dynamic fields/forms for genuinely variable attributes and configuration-driven fields.

This allows a future permit application module to have strongly modeled application relationships while still supporting different permit forms and variable fields.

## Requirements

- Node.js
- PostgreSQL
- Redis for Redis-backed functionality and readiness checks

Environment variables are documented through the application's configuration layer and example development environment files. Do not commit production secrets.

## Starting a new personal project

This repository is intended to be used as my personal backend foundation. After creating a new repository from this GitHub template, run the initializer once from the project root:

```bash
npm install
npm run init
```

It asks for:

```text
Project name: Building Permit System
Package name: building-permit-system
Database name: building_permit
Port: 3000
```

The initializer then:

- Updates `package.json` with the new package name and project description.
- Creates `.env` from `.env.example`.
- Sets `APP_NAME` and `APP_SLUG`.
- Sets the selected port and PostgreSQL database name.
- Generates fresh development JWT access, refresh, and metrics secrets.
- Validates the package name, database name, and port.
- Refuses to overwrite an existing `.env` file.

Then initialize the database:

```bash
npm run db:setup
```

`db:setup` generates the Prisma client, applies development migrations, and seeds the foundation roles and permissions. It creates the optional development admin only when both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are configured in `.env`.

Finally:

```bash
npm run dev
```

`.env` is ignored by Git. Keep `.env.example` as the safe configuration template and never commit production secrets.

## Development

Run linting and formatting checks:

```bash
npm run lint
npm run format:check
```

Run tests:

```bash
npm run test:unit
npm run test:integration
npm run test:all
```

Database commands:

```bash
npm run db:setup
npm run db:seed
npm run prisma:migrate
npm run prisma:migrate:deploy
```

## API documentation

The OpenAPI specification is stored under `docs/openapi.yaml`. In non-production environments, Swagger UI is served at `/docs`. The specification is maintained as the public API contract; internal feature capabilities that are not mounted under `src/routes/index.js` should not be documented as public endpoints.

## Development roadmap

The repository is intentionally being evolved incrementally:

1. **Architecture cleanup** — completed. Dependency boundaries were established, authentication/authorization middleware moved to their owning layers, redundant aggregators/configuration were removed, and duplicate Vitest configuration was consolidated.
2. **Shared business foundations** — completed. People, cases, participants, requirements, and tasks are implemented and hardened.
3. **Platform integration** — in progress. Shared capabilities are integrated through explicit boundaries: documents use `platform/storage`, appointments remain a real shared business feature, email uses the Resend provider boundary, and generic document/notification/audit APIs are not automatically exposed.
4. **Domain modules** — later. Implement real application domains only when required. The eventual OBO/permit system belongs under `src/modules/obo/` and should reuse the shared foundations and appointment capability.

Do not create placeholder modules merely to reserve future domain names.

## Current scope vs. planned architecture

Infrastructure and architectural boundaries are not themselves product features. A module, integration, queue, storage provider, or domain concept should only be described as implemented when it is actually wired into application behavior and covered by tests.

When this README is updated, prefer documenting observable API behavior and tested capabilities. Keep architectural intent and dependency rules in [`docs/architecture.md`](docs/architecture.md).
