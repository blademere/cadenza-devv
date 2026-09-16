# Application Authorization Boundaries

This document defines the application authorization ownership boundary for the API. It is the implementation contract for the application-owned authorization refactor.

## Scope

This boundary covers **authorization**, not authentication or identity registration.

- Authentication remains a separate concern and is not moved by this refactor.
- `features/auth` may remain a shared authentication feature until a separate application-identity decision is made.
- Authorization decisions must be evaluated in the context of an application membership.
- Reusable authorization enforcement remains in `platform/authorization` during this refactor. The planned name `platform/application-security` is a later consolidation concern, not a required rename for this refactor.

## Ownership model

```text
Application
    │
    ├── application authorization policy / resource meaning
    ├── application authorization routes (when they exist)
    └── application authorization management/orchestration
              │
              ▼
platform/authorization
    │
    ├── authorization context
    ├── permission evaluation
    ├── authorize middleware
    ├── resource authorization middleware
    ├── membership / role resolution
    └── reusable authorization persistence primitives
```

The application decides **what** a permission means for its domain. Platform decides **how** a permission is resolved, scoped, persisted, and enforced.

## Current application inventory

The API application root currently contains:

```text
apps/api/src/apps/
├── cadenza/
└── obo/
    └── authorization/
```

There is intentionally **no Admin application**. Authorization management is not a global Admin capability. Each application owns its own authorization-management API when it has application-specific authorization behavior.

## OBO boundary

### Owner

```text
apps/api/src/apps/obo/
```

### Authorization boundary

All OBO-specific authorization meaning belongs to OBO. This includes:

- OBO resource names and permission semantics.
- OBO role/capability policy decisions.
- OBO resource ownership and resource-level authorization rules.
- OBO authorization-specific orchestration that is not reusable outside OBO.
- OBO authorization-management routes and controllers.
- OBO role, permission, and membership-role management workflows.

The OBO authorization module is:

```text
apps/api/src/apps/obo/authorization/
├── authorization.routes.js
├── authorization.controller.js
├── authorization.service.js
└── authorization.validation.js
```

The OBO authorization service is the OBO-owned policy and management boundary. It validates the OBO resource vocabulary and delegates generic persistence and enforcement to reusable Platform authorization primitives. It does not access authorization persistence directly.

### OBO route ownership

Current OBO API composition is under:

```text
apps/api/src/apps/obo/obo.routes.js
```

The application mounts its domain routes and its application-owned authorization module under `/obo`.

OBO authorization-management endpoints are exposed at:

```text
/obo/authorization/modules
/obo/authorization/roles
/obo/authorization/memberships/:membershipId/roles
```

These routes resolve the OBO application context and use the OBO authorization service plus Platform authorization enforcement. Resource-level operations additionally enforce the relevant OBO-scoped resource.

OBO domain routes remain OBO-owned. They must not import another application's authorization implementation or bypass the OBO authorization service for OBO-specific authorization decisions.

## Cadenza boundary

### Owner

```text
apps/api/src/apps/cadenza/
```

Cadenza currently contains only a placeholder and has no API authorization routes or policies to migrate.

When Cadenza receives an API surface, its authorization and authorization-management behavior belongs under Cadenza and follows the same rule:

```text
apps/cadenza authorization policy/management
        ↓
platform/authorization enforcement and persistence primitives
```

No Cadenza authorization module should be created until there is Cadenza-specific authorization behavior to own.

## No global Admin authorization

There is deliberately no `apps/admin` authorization module and no global `/admin/authorization/*` endpoint.

Authorization management is an application concern, not a platform-wide Admin concern. A user who manages OBO authorization does so through the OBO authorization boundary and an OBO application membership. A future application manages its own authorization through its own application boundary.

The API composition root therefore registers application routers such as `/obo`, but does not register a global Admin authorization router.

## Global feature boundary

The following are **not** application-owned authorization modules:

- `features/auth` authentication mechanics;
- reusable business features such as appointments, cases, requirements, people, tasks, documents, and users;
- generic platform authorization enforcement;
- audit infrastructure.

A feature may still enforce an authorization requirement when its route is an explicitly exposed reusable API capability. That enforcement must use Platform primitives and must not introduce a global application-specific authorization policy.

## Platform boundary

The current shared mechanism remains:

```text
apps/api/src/platform/authorization/
```

Platform owns the mechanism, including:

- `authorize.js`;
- `authorization-resource.middleware.js`;
- authorization context services/routes;
- access-control evaluation and caching;
- membership/role/permission resolution mechanisms;
- reusable authorization-management persistence and service primitives;
- generic authorization errors and enforcement behavior.

Platform must not contain:

- OBO role meanings;
- application UI/API workflows;
- OBO resource policies;
- application-specific authorization-management business rules;
- imports from `apps/*`.

## Forbidden dependency directions

The following are forbidden:

```text
apps/obo ─────────X────────> another app's authorization implementation
apps/* ───────────X────────> features/admin/authorization
apps/* ───────────X────────> a global application-specific authorization module
platform ─────────X────────> apps/*
platform ─────────X────────> application-specific authorization policy
```

The allowed direction is:

```text
apps/<app>
    ↓
platform/authorization
```

Reusable features may also use Platform authorization primitives when they expose an explicitly public API capability.

## Route registration boundary

`apps/api/src/routes/index.js` remains the API composition root, but it must register **application routers**, not own application authorization behavior.

Current state:

```text
/obo/*                 → apps/obo/obo.routes.js
```

There is no `/admin/authorization/*` registration.

## Dependency and legacy validation

Automated architecture tests enforce the following contracts:

- application code does not import legacy global authorization implementations;
- application code does not import another application's implementation;
- Platform code does not depend on application implementations;
- application authorization modules use Platform authorization primitives;
- the Admin application authorization implementation does not exist;
- legacy global authorization paths and `User.role`/`findRoleByName` references are rejected;
- authorization route validation covers application-owned route trees as well as Platform and reusable feature routes;
- router-level authentication/authorization middleware is recognized by the authorization validator;
- application-selection routes are explicitly documented as `auth-boundary` routes because they establish/select application context rather than authorize an application resource.

## Final audit checklist

- [x] OBO authorization ownership established under `apps/api/src/apps/obo/authorization/`.
- [x] OBO authorization routes are registered through the OBO application router.
- [x] OBO-specific authorization semantics are isolated from Platform.
- [x] OBO authorization-management behavior is isolated from Platform.
- [x] Resource-level authorization uses Platform enforcement primitives.
- [x] Platform authorization management persistence is reusable and app-scoped.
- [x] Applications do not depend on other application implementations.
- [x] Platform does not depend on applications.
- [x] Global Admin authorization implementation and route registration are removed.
- [x] Legacy global authorization implementation paths are absent.
- [x] `User.role` and `findRoleByName` legacy assumptions are rejected by architecture validation.
- [x] Route-level authorization validation includes `src/apps`.
- [x] Architecture tests cover application authorization boundaries.
- [x] Authorization tests cover application scope, membership isolation, and cross-application isolation.

## Phase constraints preserved

1. Do not move generic authorization middleware into an application.
2. Do not copy Platform role/permission repositories into OBO or another application.
3. Do not create a global application authorization module.
4. Preserve application context requirements for application-scoped authorization.
5. Keep route registration in the API composition root while keeping route implementation in the owning application.
6. Do not introduce `User.role` as a compatibility mechanism.
7. Do not allow Platform authorization code to import application implementations.
8. Authorization-management workflows belong to the application whose authorization they manage.
