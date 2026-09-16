# Application Domain Phase 14 — Service/API Boundaries

## Decision

Application ownership is explicit at shared feature/service boundaries. Application-specific callers pass `appId` as data; reusable feature services do not accept Express `req`, inspect route state, or depend on application-specific modules.

## Boundary

Preferred shape:

```js
await featureService.operation({
  appId,
  ...operationData,
})
```

The application layer resolves the current application context and passes only the ownership value required by the shared capability.

## Rules

- Shared feature services must not depend on `req`, `req.appContext`, or OBO application modules.
- Application-owned reads and writes require `appId` at the service boundary.
- Repositories remain responsible for enforcing `appId` in database queries.
- Global catalog operations may remain unscoped when the underlying entity is intentionally global.
- Platform mechanisms may receive `appId` when the operation creates or reads application-owned data.
- Child records inherit ownership from their application-owned parent where they do not have a direct `appId`.

## Phase 14 changes

- Case creation uses an explicit application context.
- Task creation uses an explicit application context.
- Participant application services use an explicit application context for case-bound operations.
- OBO remains the composition layer: it resolves OBO `appId` and supplies it to shared capabilities.
- No shared feature imports an OBO application module.

## Anti-patterns

Do not introduce:

```js
featureService.operation(req)
```

or:

```js
repository.findById(id)
```

for an application-owned record when an application-scoped lookup is required.

## Compatibility

This phase standardizes the service contract without moving reusable feature implementations into `apps/obo`. Existing global catalog operations remain global where their data model is intentionally global.
