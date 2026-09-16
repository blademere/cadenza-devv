# Application-Scoped Domain Data — Phase 18 Migration

## Purpose

Phase 18 finalizes application ownership at the database boundary without guessing ownership for legacy records.

The migration is fail-closed:

1. Backfill missing `appId` only from authoritative domain relationships.
2. Validate that all required application-owned records have an owner.
3. Validate that parent/child records agree on `appId`.
4. Reject unresolved or contradictory data instead of assigning it to OBO.
5. Strengthen OBO permit-application foreign keys to include `(id, appId)`.

## Authoritative backfill sources

| Record | Ownership source |
|---|---|
| `CaseRecord` | `OboPermitApplication.appId` through `caseId` |
| `Task` | owning `CaseRecord.appId` |
| `Appointment` | `OboSubmissionAppointment` → `OboPermitApplication.appId` |
| `AppointmentType` | owning `Appointment.appId` |
| `Form` | `OboPermitType.appId` through `formId` |
| `RequirementDefinition` | `CaseRequirement`/`CaseRecord` or `OboPermitTypeRequirement`/`OboPermitType` |

Ownership is never inferred from `createdByUserId`, `userId`, actor identity, or other user attributes.

## Fail-closed validation

The migration rejects any unresolved `appId` for required application-owned models, including:

- `CaseRecord`
- `Task`
- `AppointmentType`
- `Appointment`
- `RequirementDefinition`
- `Form`
- `OboPermitType`
- `OboPermitApplication`
- `OboProfessional`

It also rejects parent/child ownership mismatches before final constraints are installed.

## Database-level isolation

`OboPermitApplication` now uses composite foreign keys for its application-owned parents:

```text
(caseId, appId)
    → CaseRecord(id, appId)

(permitTypeId, appId)
    → OboPermitType(id, appId)
```

This prevents an OBO permit application from referencing a record belonging to another application even if application code is bypassed.

## Intentionally nullable ownership

`Document.appId` remains nullable because `NULL` explicitly represents a shared/global document in the current design.

`AuditLog.appId` remains nullable because platform audit entries may be contextual rather than application-owned.

Those records are therefore not treated as unresolved migration failures.

## Migration

`apps/api/prisma/migrations/20260916180000_finalize_application_ownership/migration.sql`

The migration should be applied only after reviewing any failed ownership validation. Ambiguous records must be explicitly classified before retrying; they must not be assigned based on user identity.
