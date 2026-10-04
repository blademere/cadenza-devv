# API Application

Express 5 API application.

The API workspace owns the HTTP runtime, Prisma schema and migrations, OpenAPI contract, API application boundaries, reusable features, platform services, infrastructure adapters, and API tests.

## Source layout

```text
apps/api/
├─ prisma/                 # Prisma schema and migrations
├─ openapi/                # Public API contract
├─ src/
│  ├─ apps/                # Application/domain boundaries
│  ├─ features/            # Reusable business capabilities
│  ├─ platform/            # Reusable mechanisms
│  ├─ infrastructure/      # Technical adapters/providers
│  ├─ common/              # Cross-cutting HTTP and utility helpers
│  ├─ config/              # API configuration
│  └─ routes/              # API composition
└─ tests/                  # API tests
```

The current application boundaries under `src/apps/` include `cadenza` and `obo`.

The API is mounted under `/api/v1`. The composition root is `src/routes/index.js`, while the Express application and operational endpoints are defined in `src/app.js`.

Prisma is owned by this API workspace and is accessed through repository boundaries from application, feature, and platform business code.