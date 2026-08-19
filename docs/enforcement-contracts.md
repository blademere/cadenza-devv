# Enforcement Contracts

These contracts apply to every current and future feature/module.

## 1. Entity deletion semantics

Every persistent mutable entity must explicitly choose exactly one lifecycle strategy:

- `SOFT_DELETE` — records remain queryable for audit/recovery and normal repositories must exclude deleted rows by default.
- `HARD_DELETE` — deletion is permanent and must be explicitly authorized and audited.
- `IMMUTABLE` — records are never updated/deleted; corrections are represented by a new version/event/history record.

A new entity must document its choice next to its Prisma model or in the owning feature's architecture documentation. Do not add a generic soft-delete abstraction to entities that do not require it.

## 2. Audit coverage

Every externally reachable state-changing operation must produce an audit record in the same transaction as the mutation whenever the mutation is transactional. The audit entry must identify the actor, action, entity type, entity id, and sanitized before/after state when applicable.

Reads do not require audit records unless the owning security policy explicitly requires access logging.

## 3. Idempotency

Every externally reachable `POST`, `PUT`, `PATCH`, and `DELETE` mutation must explicitly declare whether idempotency is required.

For operations that create or otherwise retry a state transition, idempotency is mandatory. The route must use the shared idempotency middleware rather than implementing a local mechanism.

An operation that is deliberately exempt must document why retries are safe without a key.

## 4. Resource authorization

A route operating on a specific resource (`/:id`, `/:resourceId`, or equivalent) must perform resource-level authorization when access depends on ownership, tenant, relationship, or resource state. RBAC alone is insufficient for those operations.

Use `platform/authorization/authorizeResource.js` and the shared policy mechanism. Services may retain scoped repository lookups as defense in depth.

## 5. Feature/platform boundary

Dependency direction is one-way:

```text
routes/modules/features
        ↓
     platform
        ↓
infrastructure/common
```

- `platform` must never import `features` or domain modules.
- `common` must not import `features` or `platform`.
- A feature must not duplicate a generic platform capability when the platform already owns that mechanism.
- Domain-specific rules belong to a module/feature; reusable mechanisms belong to platform.
- Infrastructure must not contain domain business rules.

These rules are checked by `scripts/validate-architecture.cjs` and are intended to run in CI.
