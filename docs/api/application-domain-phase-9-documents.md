# Application Domain Phase 9 — Documents

**Branch:** `refactor/application-scoped-domain-data`

**Scope:** document ownership, repository isolation, OBO document attachment

## Decision

The reusable document capability remains in `features/documents`.

Document data has two explicit ownership states:

```text
Document.appId != null
    -> application-owned document

Document.appId == null
    -> explicitly shared/global document
```

`DocumentType` remains global because it is a reusable classification/catalog. `OboPermitApplicationDocument` remains an OBO-specific association owned by the OBO permit application and its case requirement.

## Persistence changes

`Document` now contains a nullable `appId` foreign key to `App` and an index on `(appId, createdAt)`.

The migration is additive and leaves existing documents with `appId = null`, preserving their current shared/global semantics until a later controlled migration assigns application ownership from authoritative relationships.

## Repository contract

The shared document repository accepts an optional `appId` for owned-document lookup, list, and soft-delete operations.

When `appId` is supplied, the repository permits:

```text
ownerId = current user
AND deletedAt IS NULL
AND (appId = current app OR appId IS NULL)
```

This means application-owned documents cannot cross application boundaries, while explicitly shared documents remain usable inside an application context.

## OBO integration

The OBO application-document service passes the current `appId` when resolving an attached document.

Therefore:

```text
OBO request
  -> OBO app context
  -> OBO permit application
  -> document attachment
  -> document.appId = OBO OR document.appId IS NULL
```

A document owned by another application is rejected by the shared document repository and cannot be attached to an OBO permit application.

The existing `OboPermitApplicationDocument` relationship remains the application-specific association; the reusable document feature is not moved into OBO.

## Storage and uniqueness

`Document.storageKey` remains globally unique because it identifies a storage object, not an application business identifier. The checksum remains a global content property.

No application-scoped uniqueness is introduced for `DocumentType.key` because document types remain a global catalog.

## Migration strategy

Phase 9 uses a nullable `appId` first. Existing rows are intentionally not assigned an application by guessing from the owner user.

Later migration work may backfill `Document.appId` only from authoritative application relationships. Shared documents can remain `NULL` when the domain explicitly permits reuse across applications.

## Verification requirements

- [x] `Document` has nullable `appId`.
- [x] `App` exposes the document relation.
- [x] Application-aware document repository filters are implemented.
- [x] Document service propagates application context.
- [x] Resource authorization loads documents with application context.
- [x] OBO document attachment passes application context.
- [x] Migration adds the foreign key and application index.
- [x] Unit coverage verifies service-level application-scope propagation.
- [ ] Full repository/integration isolation tests should be completed with the database-backed test suite.

## Architecture outcome

The implementation preserves the intended separation:

```text
apps/obo
   -> owns OBO document workflow and policy

features/documents
   -> reusable document business capability

platform/storage
   -> reusable storage mechanism

Document.appId
   -> persistence-level application ownership
```
