# Application Domain Phase 17 — Tests

## Purpose

Phase 17 adds a regression matrix for application ownership across the reusable domain capabilities used by OBO.

The tests protect the architectural invariant:

```text
Application context
      ↓
Shared service boundary
      ↓
Application-scoped repository
      ↓
appId-aware query
      ↓
Database ownership
```

Middleware and authorization are defense-in-depth; repository ownership remains the isolation boundary.

## Coverage matrix

| Capability | Repository scope | Service boundary | Ownership rule |
| --- | --- | --- | --- |
| Cases | `id + appId`, scoped lists/counts/transitions | explicit `appId` | direct application ownership |
| Tasks | `id + appId`, case/app validation | explicit `appId` | direct application ownership and case consistency |
| Appointments | appointment/app and appointment-type/app scope | explicit `appId` | direct application ownership; child schedule/slot ownership inherited through appointment type |
| Requirements | definition `appId`; case requirements through `Case.appId` | explicit `appId` | definitions are application-owned; case requirements inherit case ownership |
| Forms | form `id/key + appId`; versions through `Form.appId` | explicit `appId` | form owns version ownership |
| Documents | application-owned records plus explicit `appId = null` shared records | optional `appId` | shared/global documents are an intentional exception |
| Participants | all case operations require `Case.appId` | explicit `appId` | participant ownership is inherited from the case |
| Audit | audit persistence accepts `appId` | explicit appId or execution context | contextual ownership; nullable for global events |

## OBO coverage

The OBO permit-application repository is additionally checked for application-scoped:

- direct reads
- client-owned reads
- creation
- updates and post-update re-reads

The test verifies that OBO application data uses the OBO application identifier rather than relying on user identity alone.

## Cross-application isolation

A repository query is considered isolated when its lookup/list/update operation carries the owning application into the database predicate.

For example:

```js
findFirst({
  where: { id, appId },
})
```

or, for a child owned through a parent:

```js
findFirst({
  where: {
    id,
    caseRecord: { appId },
  },
})
```

This prevents an OBO-scoped request from resolving a record owned by another application even if the record identifier is otherwise valid.

## Unique constraints

The Phase 17 regression suite also checks the Phase 13 migration for application-scoped unique indexes on application-owned identifiers, including case numbers, form keys, requirement keys, appointment identifiers, permit identifiers, and professional identifiers.

## Test location

```text
apps/api/tests/unit/application-scope/phase-17-isolation.test.js
```

Run the API unit suite with:

```bash
npm run test:unit
```

or run the individual regression file with Vitest.

## Scope of this phase

These are regression/contract tests and do not replace database-backed integration tests. Phase 18 migration work and the final E2E audit should validate the same ownership rules against a real PostgreSQL database and the complete OBO request path.
