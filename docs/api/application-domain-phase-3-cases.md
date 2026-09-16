# Application Domain Phase 3 — Cases

## Goal

Make `CaseRecord` explicitly owned by an application while keeping the cases capability under `features/cases` and reusable by every application.

## Ownership

```text
App
 └── CaseRecord
      ├── CaseStatusHistory
      ├── CaseParticipant
      ├── CaseRequirement
      └── Task
```

`CaseRecord.appId` is the direct ownership boundary. Child records inherit ownership through their case and do not receive a duplicated `appId` in this phase.

## Implementation

- `CaseRecord.appId` is required and references `App` with `ON DELETE RESTRICT`.
- Case repository reads, lists, counts, and status transitions require `appId` and include it in their database predicates.
- Case service creation, reads, lists, and transitions require application context.
- OBO permit application creation passes the OBO `appId` into the shared case feature.
- Existing global `caseNumber` uniqueness is intentionally retained; application-specific uniqueness is deferred to Phase 13.

## Migration

`20260916140000_scope_cases_to_application`:

1. Adds nullable `appId`.
2. Backfills cases from the authoritative `OboPermitApplication.caseId` relationship to the App whose key is `obo`.
3. Fails closed if any case cannot be assigned an owner.
4. Makes `appId` required.
5. Adds application indexes and the foreign key.

Ownership is not inferred from `createdByUserId` or the authenticated user.

## Non-goals

- Do not move `features/cases` into `apps/obo`.
- Do not add `appId` to `CaseStatusHistory`, participants, requirements, or tasks yet; those inherit ownership through `CaseRecord` and are handled in their dedicated phases.
- Do not change global unique constraints in this phase.
