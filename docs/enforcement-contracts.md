# Enforcement Contracts

These contracts describe the repository-wide rules that are enforced by tests, middleware, validators, or architectural review.

## 1. Entity deletion semantics

Every persistent mutable entity must explicitly choose exactly one lifecycle strategy:

- `SOFT_DELETE` — records remain queryable for audit/recovery and normal repositories exclude deleted rows by default.
- `HARD_DELETE` — deletion is permanent and must be explicitly authorized and audited.
- `IMMUTABLE` — records are never updated/deleted; corrections are represented by a new version/event/history record.

A new entity must document its choice next to its Prisma model or in the owning feature/module documentation. Do not add a generic soft-delete abstraction to entities that do not require it.

## 2. Audit coverage

Externally reachable state-changing operations must produce an audit record in the same transaction as the mutation whenever the mutation is transactional. Audit entries identify the actor, action, entity type, entity ID, and sanitized before/after state where applicable.

Reads do not require audit records unless the owning security policy explicitly requires access logging.

## 3. Idempotency

Externally reachable state-changing HTTP operations must explicitly declare their idempotency behavior. Operations that create resources or retry state transitions must use the shared idempotency mechanism rather than implementing a local mechanism.

An operation that is deliberately exempt must document why retries are safe without a key.

## 4. Resource authorization

A route operating on a specific resource must perform resource-level authorization when access depends on ownership, tenant, relationship, or resource state. RBAC alone is insufficient for those operations.

Use the shared authorization policy mechanism. Services may retain scoped repository lookups as defense in depth.

## 5. Dependency boundary

The architectural dependency direction is:

```text
modules → features → platform → infrastructure
```

Supporting application code such as routes and common HTTP helpers must not be used to bypass this direction.

- `platform` must not import `modules`.
- shared `features` must not import `modules`.
- `infrastructure` must not import `modules`.
- services must not access Prisma directly; repositories own persistence access.
- repositories are explicitly allowed to access Prisma.
- domain-specific rules belong in modules; reusable business capabilities belong in features; reusable mechanisms belong in platform.
- infrastructure must not contain domain business rules.

These rules are checked by `scripts/validate-architecture.cjs` and run in CI.
