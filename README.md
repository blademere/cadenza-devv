# Express App

A CommonJS Express 5 API with PostgreSQL/Prisma, Redis-backed infrastructure, authentication, OAuth, and permission-based access control.

> **Personal foundation:** This repository is maintained as a reusable backend foundation for my own projects. It intentionally keeps strong opinions about the stack and infrastructure instead of trying to be a generic Express boilerplate for everyone.

> **Current scope:** This README describes the functionality that is implemented in the repository today. It intentionally does not describe the broader platform architecture or future modules that are not currently exposed through the application routes.

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

### Users

The currently exposed user API supports:

- Listing users with pagination.
- Creating users.
- Validation of user input.
- Role-aware authorization for user read/create operations.

The application does **not** currently expose a complete user-management CRUD surface; update/delete and other planned user operations should not be considered implemented features.

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
- Database migrations managed with Prisma.
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

## Project structure

```text
src/
├─ common/             # Middleware, validation, errors, responses, utilities
├─ config/             # Environment, logging, Swagger configuration
├─ features/
│  ├─ auth/            # Password auth, JWT/refresh tokens, OAuth
│  ├─ access-control/  # Permission and authorization services
│  └─ users/           # User API and user services
├─ infrastructure/
│  ├─ cache/           # Redis
│  ├─ database/        # Prisma/PostgreSQL
│  ├─ email/           # Email providers
│  ├─ monitoring/      # Metrics/logging/observability
│  ├─ oauth/            # OAuth provider integrations
│  ├─ queue/            # BullMQ
│  └─ storage/          # S3/Cloudinary
├─ routes/              # API route mounting
└─ server.js            # Application entrypoint

prisma/                 # Schema and migrations
docs/                   # OpenAPI specifications
tests/                  # Unit and integration tests
scripts/                # Database and project utilities
```

## Requirements

- Node.js
- PostgreSQL
- Redis for the Redis-backed functionality and readiness checks

Environment variables are documented through the application's configuration layer and example development environment files. Do not commit production secrets.

## Development

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Run the API in development:

```bash
npm run dev
```

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

Database migrations:

```bash
npm run prisma:migrate
npm run prisma:migrate:deploy
```

## Starting a new personal project

This repository is intended to be used as my personal backend foundation. After creating a new repository from this GitHub template, run the initializer once from the project root:

```bash
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
- Sets the selected port and PostgreSQL database name.
- Generates fresh development JWT access, refresh, and metrics secrets.
- Refuses to overwrite an existing `.env` file.

After initialization:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

`.env` is ignored by Git. Keep `.env.example` as the safe configuration template and never commit production secrets.

## API documentation

The OpenAPI specifications are stored under `docs/`. In non-production environments, Swagger UI is served at `/docs`.

## Current scope vs. planned architecture

The repository contains infrastructure and directory boundaries intended to support a larger platform, but those boundaries are not themselves product features. Modules, integrations, queues, storage providers, or domain concepts should only be treated as implemented functionality when they are wired into the current application behavior.

When this README is updated, prefer documenting observable API behavior and tested capabilities over planned architecture, placeholder directories, or dependency presence.
