# Application Ownership Contract

**Phase:** 1 — Application Ownership Model
**Branch:** `refactor/application-scoped-domain-data`
**Baseline:** `development` at `13f4313b932769b3e0b26987586a13aa68f32d4e`

## Purpose

Define the common contract used when shared feature data becomes application-scoped. This phase establishes conventions only; individual domain migrations remain in later phases.

## Ownership vocabulary

### Global data

A global entity has no application owner and must not receive an artificial `appId` merely to make queries convenient.

Examples:

- `User`
- `Person`
- `App`
- shared infrastructure records

### Application-owned data

An application-owned entity has a direct `appId` foreign key to `App` when the entity can exist independently in more than one application.

Conceptually:

```text
Application
    └── DomainRecord.appId
```

The database should index `appId`. Application-specific identifiers should use composite uniqueness such as `@@unique([appId, key])` when the identifier is only unique within an application.

### Inherited application ownership

A child entity may omit a redundant `appId` when its parent is application-owned and all access is required to traverse that parent.

```text
CaseRecord.appId
    └── CaseRequirement
    └── CaseParticipant
    └── CaseStatusHistory
```

Direct ownership may still be added later when a database constraint or query pattern requires it.

## Service/repository boundary

Shared business capabilities must receive application scope explicitly:

```js
service.list({ appId, ... })
repository.findById({ id, appId })
```

The preferred boundary is the normalized `appId` value, not an Express request object.

A repository for application-owned data must not silently fall back to an unscoped lookup.

Bad:

```js
findById(id)
```

Preferred:

```js
findById({ id, appId })
```

The shared application-scope helpers in `platform/applications/application-scope.js` provide the common normalization and required-scope contract.

## Context versus ownership

`platform/applications/application-context.middleware.js` establishes the authenticated application's context. That context is useful for HTTP/application composition, but it does not replace the explicit service/repository `appId` contract.

```text
HTTP request
    ↓
Application context
    ↓
Application-owned service call { appId }
    ↓
Repository query scoped by appId
    ↓
Database
```

This prevents application isolation from depending solely on middleware.

## Foreign-key consistency

For entities with both `appId` and an application-owned parent, the values must agree.

Example:

```text
Task.appId = OBO
Task.caseId → CaseRecord.appId = OBO
```

A task must not be attachable to a case belonging to another application.

Later domain phases should enforce this in the repository/service transaction and, where practical, through database constraints.

## Constraint conventions

Use:

```prisma
appId String
app   App @relation(fields: [appId], references: [id], onDelete: Restrict)

@@index([appId])
```

for a required application owner, subject to the existing deletion semantics of the domain.

Use:

```prisma
@@unique([appId, key])
```

when `key` is application-local.

Do not change a global `@unique` constraint until Phase 13 confirms that the identifier is application-local.

## Migration convention

Application ownership migrations must follow this order:

```text
nullable appId
    ↓
backfill authoritative ownership
    ↓
validate every row
    ↓
resolve ambiguous ownership
    ↓
make appId required
    ↓
add indexes / scoped uniqueness
```

Ownership must be derived from authoritative domain relationships whenever possible. It must not be inferred from the identity of the user who created a record.

## Rules frozen by Phase 1

1. `appId` is the canonical ownership key for independently application-owned data.
2. Global entities remain global unless a domain decision says otherwise.
3. Child entities inherit ownership from application-owned parents unless direct ownership is justified.
4. Shared features remain under `features/*`.
5. Shared features accept `appId` as an explicit service/repository input.
6. Repositories enforce application ownership rather than trusting authorization middleware alone.
7. Application context and database ownership are complementary, not interchangeable.
8. Global uniqueness is not changed without an explicit domain decision.
9. Cross-application parent/child relationships must be rejected.
10. Application-specific code must not be imported by shared features or platform infrastructure.

## Phase 1 scope boundary

Phase 1 does **not** add `appId` to every target entity. Domain migrations begin in the subsequent phases, starting with the OBO core domain and then shared cases/tasks/appointments/forms.
