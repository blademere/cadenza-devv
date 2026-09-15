# Formal Plan: Make Features Routeless

## 1. Objective

Restructure the API so that application features are reusable, route-less capabilities, while modules own the HTTP/API boundaries for the business domains they implement.

The target architecture is:

```text
HTTP Request
    ↓
Module Router / Controller
    ↓
Module Service
    ↓
Feature Service(s) / Platform Service(s)
    ↓
Repositories / Infrastructure
```

The central rule is:

> Features provide reusable application capabilities. Modules provide business-facing API boundaries. Features must not own HTTP routes, except for the explicitly permitted authentication boundary.

This plan also establishes that routes required by a module must live inside that module rather than remaining in a feature merely because the underlying capability is implemented by that feature.

---

## 2. Scope

This plan covers:

- Removing business/API routes from `apps/api/src/features`.
- Moving module-required HTTP routes into the owning module.
- Preserving reusable feature services and domain capabilities.
- Removing feature route registration from the application route composition.
- Keeping authentication as an explicit architectural exception where HTTP authentication endpoints/middleware are required.
- Keeping shared infrastructure in `platform`.
- Keeping authorization administration and business authorization ownership inside modules while using platform authorization infrastructure for enforcement.
- Adding architectural enforcement so new feature routes cannot be introduced accidentally.

This plan does **not** require moving reusable business features into `platform` merely because they are used by multiple modules.

---

## 3. Architectural Principles

### 3.1 Features are route-less

A normal feature may contain:

- services
- domain/application logic
- repositories or persistence adapters where appropriate
- validation schemas used by its service API
- mappers
- policies/helpers that belong to the reusable capability
- tests

A normal feature must not contain:

- Express routers
- HTTP controllers
- module-specific HTTP endpoints
- application-level route registration

The feature service API is the reusable boundary.

### 3.2 Modules own HTTP boundaries

A module owns:

- routes
- controllers
- module-specific request validation
- module-specific response mapping
- module-specific workflows
- module-specific authorization policy
- module-specific roles and permissions
- module-specific resource authorization

If a module needs access to a capability implemented by a feature, the module calls the feature service rather than exposing or mounting the feature's routes.

### 3.3 Authentication is the explicit exception

Authentication is infrastructure-like and is allowed to retain an HTTP boundary where necessary because authentication establishes the request identity used by the rest of the application.

This exception must remain explicit and must not become a precedent for ordinary business features to own routes.

### 3.4 Platform is not a replacement for features

`platform` is reserved for reusable cross-cutting infrastructure and application-wide technical capabilities.

Examples include:

- authorization enforcement infrastructure
- audit infrastructure
- forms infrastructure
- configuration
- database/infrastructure primitives
- other genuinely cross-cutting capabilities

A reusable business capability such as people, appointments, cases, or tasks does not become `platform` simply because multiple modules consume it.

### 3.5 Authorization ownership

Authorization infrastructure belongs to `platform`, but authorization administration belongs to the owning module.

Therefore:

```text
Module
 ├── roles
 ├── permissions
 ├── resource authorization rules
 └── authorization administration
        ↓
Platform authorization enforcement
```

Features must not define global business authorization administration.

---

## 4. Target Directory Model

The target structure is conceptually:

```text
apps/api/src/
├── features/
│   ├── people/
│   │   ├── people.service.js
│   │   ├── people.repository.js
│   │   └── ...
│   ├── appointments/
│   │   ├── appointment.service.js
│   │   └── ...
│   └── auth/                    # explicit exception
│       ├── auth.routes.js
│       ├── auth.service.js
│       └── ...
│
├── modules/
│   ├── <module-a>/
│   │   ├── <domain>/
│   │   │   ├── *.routes.js
│   │   │   ├── *.controller.js
│   │   │   ├── *.service.js
│   │   │   └── ...
│   │   └── *.routes.js
│   └── <module-b>/
│       └── ...
│
├── platform/
│   ├── authorization/
│   ├── audit/
│   ├── forms/
│   └── ...
│
└── routes/
    └── index.js
```

The exact filenames may vary, but ownership must remain consistent.

---

## 5. Route Ownership Rule

Every HTTP route must have exactly one business owner.

### Feature route

```text
features/<feature>/*.routes.js
```

Forbidden for normal features.
/modules/obo

### Module route

```text
modules/<module>/**/*.routes.js
```

Required when the endpoint belongs to that module's API.

### Platform route

A platform route is allowed only when the platform capability itself genuinely exposes an application-wide technical/API boundary and the boundary is intentionally platform-owned.

Platform must not become a dumping ground for business endpoints.

---

## 6. Migration Strategy

The migration must be incremental and must preserve behavior at every phase.

### Phase 0 — Inventory and ownership audit

Before deleting or moving anything:

1. Enumerate every route file under `features`.
2. Enumerate every route registration in `apps/api/src/routes/index.js` and other application route composers.
3. Identify every consumer of each feature route.
4. Identify whether each endpoint is:
   - module-owned,
   - authentication-owned,
   - platform-owned, or
   - obsolete.
5. Identify the service/controller dependencies behind each endpoint.
6. Identify tests, clients, documentation, and OpenAPI contracts relying on each endpoint.

**Deliverable:** route ownership matrix.

Example:

| Current Route Owner | Endpoint | Correct Owner  | Action            |
| ------------------- | -------- | -------------- | ----------------- |
| Feature             | `/...`   | Module X       | Move route        |
| Feature             | `/...`   | Authentication | Keep as exception |
| Feature             | `/...`   | None           | Remove            |
| Platform            | `/...`   | Platform       | Review/retain     |

### Phase 1 — Establish module route boundaries

For every endpoint identified as module-owned:

1. Create the corresponding route file under the owning module.
2. Move the controller/handler if it is module-specific.
3. Keep reusable feature services in their existing feature.
4. Update imports so module code consumes feature services directly.
5. Move module-specific validation into the module.
6. Move module-specific authorization definitions into the module.

The module must become the complete HTTP boundary.

### Phase 2 — Move module-required routes

Routes required by modules must be moved from feature route files into the appropriate module.

The migration must preserve:

- HTTP method
- URL contract unless an intentional API correction is approved
- request parameters
- request body contract
- response contract
- status codes
- authentication behavior
- authorization behavior
- validation behavior
- error behavior

The important architectural change is ownership, not an unnecessary API redesign.

### Phase 3 — Remove feature route registration

After module routes are available:

1. Remove the old feature route imports.
2. Remove feature route mounting from the application router.
3. Confirm no module or application code imports feature routers.
4. Confirm no duplicate routes exist.
5. Confirm the module route is now the only owner of the endpoint.

### Phase 4 — Remove obsolete feature route files

Only after route migration and validation:

1. Delete obsolete feature route files.
2. Delete feature controllers that have no remaining feature-level responsibility.
3. Retain reusable feature services and supporting code.
4. Remove dead imports and dependencies.
5. Update tests.

No feature service should be deleted merely because its route was removed.

### Phase 5 — Authentication exception audit

Review `features/auth` separately.

Document exactly which authentication HTTP boundaries remain and why.

Authentication may retain routes/middleware when they are part of establishing identity, login/session/token behavior, callback handling, or equivalent authentication concerns.

Do not extend this exception to ordinary business features.

### Phase 6 — Architecture enforcement

Update architecture validation so that normal feature directories cannot contain or export HTTP routes.

The validator should fail when it detects patterns such as:

```text
features/*/*.routes.js
features/*/routes.js
features/*/*router*.js
```

The exact validator implementation should account for legitimate non-route files whose names happen to contain similar terms.

The validator should also detect application route registration importing a normal feature router.

### Phase 7 — Full verification

Run, at minimum:

```text
npm run validate:architecture
npm run validate:authorization
npm test
npm run lint
```

Also run module-specific integration/API tests.

Verify that the final route table contains no unintended duplicates and that all expected endpoints remain available through their owning modules.

---

## 7. Dependency Rules

The migration establishes these dependency rules:

| From               | To                    | Rule                                              |
| ------------------ | --------------------- | ------------------------------------------------- |
| Module             | Feature               | Allowed                                           |
| Module             | Platform              | Allowed                                           |
| Module             | Module                | Restricted; explicit integration only             |
| Feature            | Feature               | Allowed only for reusable capability dependencies |
| Feature            | Platform              | Allowed                                           |
| Feature            | Module                | Forbidden                                         |
| Platform           | Feature               | Forbidden                                         |
| Platform           | Module                | Forbidden                                         |
| Application Router | Module                | Allowed                                           |
| Application Router | Normal Feature Router | Forbidden                                         |

The most important rule is:

> A feature may provide a service consumed by a module, but a module must not depend on a feature's HTTP API internally.

---

## 8. Controller and Service Ownership

### Module controllers

Controllers should live in modules when they translate HTTP requests into module workflows.

```text
module/controller
    ↓
module/service
    ↓
feature/service
```

### Feature services

Feature services should expose reusable application operations without knowing which HTTP module invokes them.

They should not depend on:

- Express `req` / `res`
- module routers
- module controllers
- module-specific HTTP response formats

### Module services

Module services orchestrate business workflows and may compose multiple feature services.

This keeps the reusable capability independent from the API boundary.

---

## 9. Validation and Authorization Ownership

Request validation that exists only because of a particular module endpoint belongs to the module.

Reusable domain validation may remain in the feature.

Authorization follows the same ownership model:

```text
Module route
   ↓
Module authorization policy
   ↓
Platform authorization enforcement
   ↓
Feature service
```

A feature service may perform capability-level safety checks, but it must not become the owner of a module's roles, permissions, or administrative authorization model.

---

## 10. Application Router Target State

`apps/api/src/routes/index.js` should compose application/module boundaries rather than feature business APIs.

Conceptually:

```js
router.use('/module-a', moduleARoutes)
router.use('/module-b', moduleBRoutes)
router.use('/auth', authRoutes)
```

It should not evolve into:

```js
router.use('/people', peopleFeatureRoutes)
router.use('/appointments', appointmentFeatureRoutes)
router.use('/cases', caseFeatureRoutes)
```

when those endpoints are actually consumed as part of a module-owned API.

---

## 11. Testing Strategy

Each migration must include the following tests.

### Route ownership tests

Verify the endpoint exists through the module route and is no longer exposed through the old feature route.

### Service tests

Verify that reusable feature services continue to work independently of HTTP.

### Authorization tests

Verify module-owned authorization remains enforced after route movement.

### Integration tests

Verify the complete request path:

```text
HTTP → Module → Feature → Persistence
```

### Architecture tests

Verify:

- normal features contain no routes
- modules may contain routes
- feature routers are not mounted globally
- features do not import modules
- platform does not depend on modules/features in forbidden directions

---

## 12. Acceptance Criteria

The migration is complete when all of the following are true:

1. Normal features contain no HTTP route ownership.
2. Every module-facing business endpoint is owned by its module.
3. Routes required by a module have been moved into that module.
4. Feature services remain reusable without HTTP dependencies.
5. Authentication's route exception is explicitly documented.
6. Application route composition mounts module boundaries rather than normal feature routers.
7. Module authorization remains module-owned.
8. Platform authorization remains reusable enforcement infrastructure.
9. No feature imports a module.
10. No normal feature router is imported by the application router.
11. Architecture validation rejects new normal feature routes.
12. Existing API behavior is preserved unless an intentional API change is separately approved.
13. Unit, integration, architecture, authorization, and lint checks pass.

---

## 13. Rollback Strategy

Migration should be performed one route family at a time.

If a module migration causes a regression:

1. Restore the affected route registration temporarily.
2. Keep the feature service unchanged.
3. Identify the missing module dependency or contract.
4. Correct the module boundary.
5. Repeat verification.
6. Remove the temporary compatibility route only after the module endpoint is verified.

Do not solve migration failures by introducing permanent feature-to-module dependencies.

---

## 14. Implementation Order

The implementation should proceed in this order:

1. Inventory all feature routes.
2. Build the route ownership matrix.
3. Identify every module that currently depends on those routes.
4. Move required routes into their owning modules.
5. Keep reusable feature services intact.
6. Update module controllers/services/validation/authorization as required.
7. Remove old feature route registrations.
8. Remove obsolete feature route files/controllers.
9. Preserve the authentication exception.
10. Update architecture validators.
11. Run the complete validation/test suite.
12. Perform a final dependency and route-ownership audit.

No broad feature deletion or platform migration should happen before this sequence is complete.

---

## 15. Definition of Done

The architecture is considered successfully migrated when the repository makes the following statement true:

> **Features are reusable, route-less application capabilities. Modules own their business HTTP APIs and authorization administration. Platform provides shared technical infrastructure and enforcement. Authentication is the explicitly documented exception.**

This becomes the governing architecture rule for subsequent module migrations.
