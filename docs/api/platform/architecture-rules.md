# Platform Architecture Rules

Phase 9 strengthens the existing static architecture validator without changing the dependency direction:

```text
modules → features → platform → infrastructure
```

## Enforced import boundaries

The validator rejects:

- `features` importing `modules`
- `platform` importing `features` or `modules`
- `infrastructure` importing `modules`
- `common` importing `features`, `platform`, or `modules`

The rules apply to source files under `apps/api/src/` and are intentionally independent of domain names.

## Persistence boundary

Application services must not access Prisma directly:

```text
service
  ↓
repository
  ↓
Prisma / infrastructure
```

This rule already applies to feature and module services.

Phase 9 extends the rule to new platform services. Platform repositories remain the persistence boundary and may access Prisma directly.

## Existing platform persistence debt

A small, explicit baseline of platform services still contains direct Prisma access from before this rule was introduced. Those files are listed in `apps/api/scripts/architecture-rules.cjs` as `PLATFORM_PRISMA_LEGACY_EXCEPTIONS`.

The exceptions are not a general permission. They are technical-debt markers so the validator can reject any new platform service Prisma access without making the hardening branch fail on pre-existing code.

When one of those services is migrated behind its repository, remove it from the exception list in the same change.

Do not add a new exception for application code. If a platform capability genuinely needs persistence, introduce or extend a repository boundary.

## Route enforcement

The validator also enforces the existing API rules:

- state-changing routes use the shared idempotency middleware unless explicitly exempted with a justification
- resource routes use `authorizeResource` or an explicit resource-authorization helper

## Tests

Architecture rule behavior is covered by:

```text
apps/api/tests/unit/architecture/architecture-rules.test.js
```

The tests cover layer imports, new platform-service Prisma access, legacy exception boundaries, and repository ownership of Prisma.

## Adding a new platform capability

Before adding a platform service:

1. Keep it generic and domain-neutral.
2. Keep dependencies pointed downward.
3. Put persistence in a repository.
4. Do not import module or feature implementations.
5. Add architecture tests when a new static boundary is introduced.
6. Do not expand the legacy exception list.

Domain-specific behavior remains in the consuming module or feature.
