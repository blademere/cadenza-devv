# Application Domain Phase 10 — Audit

**Branch:** `refactor/application-scoped-domain-data`

**Scope:** application-aware audit context, audit persistence, audit query isolation

## Decision

Audit remains a shared platform mechanism:

```text
platform/audit
    ↓
shared audit service/repository
    ↓
AuditLog
```

No OBO-specific audit implementation is introduced under `apps/obo`.

`AuditLog.appId` is contextual and nullable:

```text
appId != null
    -> audit event belongs to an application context

appId == null
    -> explicitly global/system audit event
```

The nullable model is intentional because platform operations may occur without an application context. Application-owned domain operations must carry their application context when recording audit events.

## Application context propagation

`recordAudit()` accepts an optional `appId`. When omitted, it resolves the application from the platform execution context. The same context can supply the actor when `actorId` is omitted.

Therefore an OBO workflow can use the shared mechanism without coupling `platform/audit` to OBO:

```text
OBO request
  ↓
application context (appId = OBO)
  ↓
OBO domain service
  ↓
platform/audit.recordAudit()
  ↓
AuditLog.appId = OBO
```

An explicit caller-supplied `appId` takes precedence over the ambient context when a trusted internal operation intentionally operates on a specific application scope.

## Query isolation

Audit queries resolve `appId` from the explicit query argument or the current platform context.

When an application context exists, the generated Prisma `where` clause includes:

```text
appId = current application
```

This applies to both the paginated data query and the total-count query, preventing an application-scoped audit view from mixing records from other applications.

Entity timelines use the same query path, so an OBO timeline for a given entity remains constrained to the OBO application context.

## Audit event contract

The shared audit mechanism records:

```text
appId
actorId
entityType
entityId
action
before
after
metadata
ipAddress
userAgent
createdAt
```

Sensitive values in `before`, `after`, and `metadata` continue to be sanitized before persistence.

OBO event names remain application/domain concerns. Examples include:

```text
OBO_PERMIT_APPLICATION_SUBMITTED
OBO_PERMIT_APPLICATION_FORM_VERSION_CHANGED
OBO_PERMIT_APPLICATION_FORM_FIELD_UPDATED
```

The platform mechanism stores these events without owning OBO semantics.

## Ownership boundary

```text
apps/obo
   -> chooses when and why to audit OBO domain actions

features/*
   -> shared capabilities record audit context when appropriate

platform/audit
   -> shared persistence and query mechanism

AuditLog.appId
   -> application boundary for contextual audit data
```

The audit layer must not import or depend on `apps/obo`.

## Cross-application rule

An application-scoped audit query must never return another application's audit records.

For example:

```text
OBO context
  -> appId = OBO
  -> query AuditLog
  -> only AuditLog.appId = OBO
```

Global/system records with `appId = null` are not implicitly merged into an application-scoped result. They remain available only to explicitly global/unscoped queries or dedicated platform reporting paths.

This distinction is important: a global audit event is not the same thing as an application-owned audit event.

## Verification

- [x] `AuditLog` contains nullable `appId` and an application index.
- [x] `AuditLog` relates to `App` without moving audit into an application module.
- [x] `recordAudit()` propagates explicit `appId`.
- [x] `recordAudit()` inherits `appId` from platform context when omitted.
- [x] Audit queries inherit application scope from platform context.
- [x] Explicit application scope is supported for trusted internal queries.
- [x] Pagination and count use the same application-scoped filter.
- [x] Entity timelines reuse the application-scoped query path.
- [x] Sensitive audit payload values remain sanitized.
- [x] Unit coverage verifies application persistence and query isolation.
- [ ] Database-backed cross-application isolation tests should be completed in the later global isolation/test phases.

## Phase 10 outcome

The audit architecture now matches the application-scoped data model:

```text
Application
    ↓
application context
    ↓
shared platform audit mechanism
    ↓
AuditLog.appId
```

OBO remains an application consumer of audit rather than owning a duplicate audit subsystem.
