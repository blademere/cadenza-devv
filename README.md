# Express App

A CommonJS Express 5 API with PostgreSQL/Prisma, Redis-backed infrastructure, authentication, OAuth, and permission-based access control.

> **Personal foundation:** This repository is maintained as a reusable backend foundation for my own projects. It intentionally keeps strong opinions about the stack and infrastructure instead of trying to be a generic Express boilerplate for everyone.

> **Architecture:** The repository is being evolved toward a layered application-platform architecture. See [`docs/architecture.md`](docs/architecture.md) for the dependency rules, shared business foundations, module strategy, and roadmap.

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

Phase 2 established small, reusable business primitives under `src/features/`:

- `people` — real-world person identity/contact data.
- `cases` — generic case types, case records, and status history.
- `participants` — person-to-case role assignments.
- `requirements` — reusable requirement definitions and case requirements.
- `tasks` — generic work items, optionally associated with a case.

These are intentionally domain-neutral. They do not contain permit-specific behavior.

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
- Email integrations for Nodemailer and Resend are present.
- AWS S3 and Cloudinary storage integrations are present.
- BullMQ queue infrastructure and worker entrypoint are present.

These infrastructure integrations should not be interpreted as complete end-user product modules unless they are exposed by the current API/application flow.

## API surface

The currently mounted API routes are:

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

Operational endpoints:

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`
- `GET /docs` (non-production)

The shared Phase 2 foundations are currently reusable services rather than a public CRUD API. Domain modules will expose application-specific endpoints when they are implemented.

## Project structure

```text
src/
├─ common/                 # Cross-cutting HTTP/middleware/error/utility helpers
├─ config/                 # Environment, logging, Swagger, and application configuration
├─ features/               # Shared business/application capabilities
│  ├─ appointments/        # Generic appointment foundation
│  ├─ audit/               # Audit feature
│  ├─ auth/                # Password auth, JWT/refresh tokens, OAuth
│  ├─ cases/               # Generic case foundation
│  ├─ documents/           # Document feature
│  ├─ notifications/       # Notification feature
│  ├─ participants/        # Case/person participation
│  ├─ people/              # Real-world person identity
│  ├─ requirements/        # Reusable case requirements
│  ├─ tasks/               # Generic work items
│  └─ users/                # User API and user services
├─ platform/               # Reusable engines/mechanisms
│  ├─ authorization/       # Generic authorization engine
│  ├─ approvals/           # Approval mechanisms
│  ├─ forms/               # Dynamic form mechanisms
│  ├─ custom-fields/       # Configurable metadata fields
│  ├─ event-bus/           # Generic domain event dispatching
│  ├─ jobs/                # Background job primitives
│  ├─ notifications/       # Notification infrastructure
│  ├─ rules/               # Generic rule evaluation
│  ├─ scheduler/           # Scheduling primitives
│  ├─ search/              # Provider-neutral search abstraction
│  └─ ...                  # Other reusable platform engines
├─ infrastructure/         # Concrete technical adapters/providers
│  ├─ cache/               # Redis
│  ├─ database/            # Prisma/PostgreSQL
│  ├─ email/               # Email providers
│  ├─ monitoring/          # Metrics/logging/observability
│  ├─ oauth/               # OAuth provider integrations
│  ├─ queue/               # BullMQ
│  └─ storage/             # Object storage providers
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

The OpenAPI specifications are stored under `docs/`. In non-production environments, Swagger UI is served at `/docs`.

## Development roadmap

The repository is intentionally being evolved incrementally:

1. **Architecture cleanup** — establish dependency boundaries and move reusable authorization into `platform`.
2. **Shared business foundations** — people, cases, participants, requirements, and tasks. **Completed.**
3. **Platform integration** — connect shared business actions to audit, events, workflow/rules, appointments, documents, notifications, jobs, and scheduler without putting domain rules into `platform`.
4. **Domain modules** — implement real application domains only when required. The eventual OBO/permit system belongs under `src/modules/obo/` and should reuse the shared foundations.

Do not create placeholder modules merely to reserve future domain names.

## Current scope vs. planned architecture

Infrastructure and architectural boundaries are not themselves product features. A module, integration, queue, storage provider, or domain concept should only be described as implemented when it is actually wired into application behavior and covered by tests.

When this README is updated, prefer documenting observable API behavior and tested capabilities. Keep architectural intent and dependency rules in [`docs/architecture.md`](docs/architecture.md).
