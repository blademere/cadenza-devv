---
name: Express-agent
description: Describe what this custom agent does and when to use it.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
# tools: ['vscode', 'execute', 'read', 'agent', 'edit', 'search', 'web', 'todo'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---

# Express.js Backend Workspace Instructions

You are working in a production-ready Express.js backend.

This project follows a **feature-based architecture** with clear separation between **business logic**, **shared utilities**, and **infrastructure integrations**.

Always follow these instructions unless explicitly told otherwise.

---

# Tech Stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js (LTS) |
| Framework | Express.js |
| Language | JavaScript |
| Package Manager | npm |
| Database | MySQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | JWT + OAuth (Google, GitHub) |
| Password Hashing | bcrypt |
| Authorization | RBAC Middleware |
| API | REST |
| Documentation | Swagger / OpenAPI |
| Logging | Pino |
| Security | Helmet, CORS, HPP, Express Rate Limit |
| Environment | dotenv |
| Testing | Vitest + Supertest |
| Linting | ESLint |
| Formatting | Prettier |
| Git Hooks | Husky + lint-staged |
| Process Manager | PM2 |
| Reverse Proxy | Nginx |
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Cloud Storage | AWS S3 / Cloudinary |
| Email | Nodemailer / Resend |
| Queue | BullMQ + Redis |
| Cache | Redis |
| Monitoring | Prometheus, Grafana, Sentry |

---

# Core Principles

Always write code that is:

- Modular
- Maintainable
- Testable
- Secure
- Production-ready
- Feature-oriented
- Easy to extend

Follow:

- SOLID Principles
- DRY
- KISS
- Separation of Concerns
- Composition over inheritance
- Single Responsibility Principle

---

# Project Architecture

The application is organized by **business features**, not by file type.

Every feature owns its own:

- routes
- controller
- service
- validation
- repository (only if database access is needed)

Shared logic belongs in `common`.

Third-party integrations belong in `infrastructure`.

---

# Folder Structure

```text
src/
│
├── app.js
├── server.js
│
├── config/
│   ├── env.js
│   ├── logger.js
│   ├── swagger.js
│   └── index.js
│
├── common/
│   ├── constants/
│   ├── errors/
│   ├── helpers/
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── validate.js
│   │   ├── errorHandler.js
│   │   ├── notFound.js
│   │   ├── rateLimiter.js
│   │   └── asyncHandler.js
│   │
│   ├── responses/
│   ├── utils/
│   ├── validators/
│   └── types/
│
├── infrastructure/
│   ├── database/
│   │   ├── prisma.js
│   │   └── transactions.js
│   │
│   ├── cache/
│   │   └── redis.js
│   │
│   ├── queue/
│   │   ├── bullmq.js
│   │   ├── queues.js
│   │   └── workers/
│   │
│   ├── email/
│   │   ├── resend.js
│   │   ├── nodemailer.js
│   │   └── templates/
│   │
│   ├── storage/
│   │   ├── s3.js
│   │   └── cloudinary.js
│   │
│   ├── monitoring/
│   │   ├── sentry.js
│   │   ├── prometheus.js
│   │   └── metrics.js
│   │
│   └── oauth/
│       ├── google.js
│       └── github.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── features/
│   │
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.repository.js
│   │   ├── auth.validation.js
│   │   ├── auth.tokens.js
│   │   └── auth.constants.js
│   │
│   ├── users/
│   │   ├── user.routes.js
│   │   ├── user.controller.js
│   │   ├── user.service.js
│   │   ├── user.repository.js
│   │   ├── user.validation.js
│   │   └── user.mapper.js
│   │
│   ├── companies/
│   ├── jobs/
│   ├── applications/
│   ├── uploads/
│   └── ...
│
├── routes/
│   └── index.js
│
├── docs/
│   ├── openapi.yaml
│   ├── auth.yaml
│   ├── users.yaml
│   └── ...
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── helpers/
│
└── scripts/
```

---

# Feature Structure

Each feature should be self-contained.

Example:

```text
users/

user.routes.js

user.controller.js

user.service.js

user.repository.js

user.validation.js

user.mapper.js

user.constants.js
```

Only create files that are actually needed.

Do **not** generate empty placeholder files.

---

# Layer Responsibilities

## Routes

Responsible for:

- Defining endpoints
- Applying middleware
- Calling controllers

Routes must never:

- Query Prisma
- Contain business logic
- Perform validation manually

---

## Controller

Responsible for:

- Reading request data
- Calling services
- Returning HTTP responses

Controllers should contain almost no business logic.

---

## Service

Responsible for:

- Business logic
- Authorization rules
- Transactions
- Queue jobs
- Calling repositories
- Calling infrastructure services
- Cache logic

Services should never know anything about Express internals.

---

## Repository

Responsible only for:

- Prisma queries
- Pagination
- Transactions
- Filtering
- Persistence

Repositories should never:

- Return HTTP responses
- Validate requests
- Access Express objects

Not every feature requires a repository.

Only create one if database access exists.

---

# Validation

Use Zod for every endpoint.

Every endpoint should validate:

- body
- params
- query

Validation should happen before the controller executes.

Never trust incoming request data.

---

# Authentication

Authentication belongs only to the Auth feature.

Supported:

- JWT Access Token
- JWT Refresh Token
- Google OAuth
- GitHub OAuth

Shared authentication middleware belongs inside:

```text
common/middleware/
```

not inside the auth feature.

---

# Authorization

Implement Role-Based Access Control (RBAC).

Example roles:

```text
admin
staff
employer
applicant
```

Authorization checks belong in middleware whenever possible.

Avoid checking roles repeatedly inside services.

---

# Database

Use Prisma exclusively.

Never access Prisma directly from controllers.

Always use a single Prisma client instance.

Use repositories to isolate database logic.

Use transactions whenever multiple writes must succeed together.

---

# Caching

Redis is used for:

- caching
- sessions (if needed)
- rate limiting
- queue backend

Never use Redis as the primary database.

---

# Queue

BullMQ handles long-running work.

Examples:

- sending emails
- notifications
- report generation
- image processing

Never block an HTTP request waiting for queue completion.

---

# Email

Supported providers:

- Nodemailer
- Resend

Email sending should always be queued.

Never send emails directly inside request handlers.

---

# Cloud Storage

Supported:

- AWS S3
- Cloudinary

Store only URLs in the database.

Never store uploaded files in the repository.

---

# Logging

Use Pino.

Log:

- requests
- responses
- errors
- database failures
- authentication failures

Never log:

- passwords
- JWTs
- refresh tokens
- secrets
- OTPs

---

# Monitoring

Use:

- Prometheus
- Grafana
- Sentry

Capture:

- exceptions
- performance metrics
- queue failures
- API latency

---

# API Responses

Success

```json
{
    "success": true,
    "message": "User created successfully.",
    "data": {}
}
```

Error

```json
{
    "success": false,
    "message": "Validation failed.",
    "errors": []
}
```

Maintain a consistent response format.

---

# Error Handling

Use centralized error middleware.

Use:

- BadRequestError
- UnauthorizedError
- ForbiddenError
- NotFoundError
- ConflictError
- ValidationError

Avoid repetitive try/catch blocks in controllers.

Wrap controllers using an async handler.

---

# API Documentation

Maintain OpenAPI documentation separately inside:

```text
docs/
```

Avoid mixing Swagger definitions with business logic.

---

# Testing

Use:

- Vitest
- Supertest

Test:

- services
- repositories
- controllers
- middleware
- authentication
- authorization

Mock external services.

Never call external APIs during unit tests.

---

# Naming Conventions

Files

```text
user.controller.js
user.service.js
user.repository.js
```

Variables

```text
camelCase
```

Classes

```text
PascalCase
```

Constants

```text
UPPER_SNAKE_CASE
```

Database

```text
snake_case
```

Routes

```text
/api/v1/users
/api/v1/auth/login
/api/v1/jobs
```

---

# Code Style

Always:

- Prefer async/await
- Use early returns
- Keep functions small
- Keep files focused
- Prefer const over let
- Use descriptive names
- Add JSDoc to exported functions and complex business logic
- Reuse utilities before creating new ones

Avoid:

- Deep nesting
- Giant functions
- Circular dependencies
- Duplicate validation
- Duplicate queries
- Hidden side effects

---

# When Creating a New Feature

Create only what is required.

Possible files include:

```text
feature.routes.js
feature.controller.js
feature.service.js
feature.repository.js
feature.validation.js
feature.mapper.js
feature.constants.js
```

Do not generate unused files.

---

# AI Coding Rules

When generating code, always:

1. Follow the existing feature-based architecture.
2. Keep controllers thin.
3. Place business logic only in services.
4. Access the database only through repositories.
5. Validate all incoming data with Zod.
6. Use centralized error handling.
7. Return consistent API responses.
8. Reuse shared utilities whenever possible.
9. Keep third-party integrations inside `infrastructure`.
10. Write secure, production-ready code.
11. Prefer readability over cleverness.
12. Minimize coupling between features.
13. Avoid unnecessary abstractions.
14. Generate maintainable, scalable, and well-documented code.
15. Never introduce breaking architectural patterns without explicit instruction.