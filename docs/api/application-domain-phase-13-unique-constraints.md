# Application Domain Phase 13 — Global Unique Constraints

## Decision

Application-owned identifiers must be unique within their owning application unless there is a documented reason for global uniqueness.

This phase changes database uniqueness from:

```text
key
```

to:

```text
(appId, key)
```

for application-owned identifiers.

## Changed constraints

| Entity | Identifier | Constraint |
| --- | --- | --- |
| CaseRecord | caseNumber | `(appId, caseNumber)` |
| Form | key | `(appId, key)` |
| RequirementDefinition | key | `(appId, key)` |
| AppointmentType | key | `(appId, key)` |
| Appointment | referenceNumber | `(appId, referenceNumber)` |
| OboPermitType | key | `(appId, key)` |
| OboPermitApplication | referenceNumber | `(appId, referenceNumber)` |
| OboProfessional | personId | `(appId, personId)` |
| OboProfessional | registrationNumber | `(appId, registrationNumber)` |
| OboProfessional | prcId | `(appId, prcId)` |

`FormVersion`, `FormSection`, `FormField`, `FormOption`, `CaseRequirement`, `CaseParticipant`, appointment slots, and OBO application-document associations already have uniqueness defined by their owning parent relationship, so their existing composite constraints remain appropriate.

## Intentionally global constraints

The phase does not scope global platform identifiers such as:

- `User.email`
- `Person.userId`
- `CaseType.key`
- `DocumentType.key`
- `Document.storageKey`
- `Workflow.key`
- other platform catalog/infrastructure identifiers that are not application-owned

`Document.storageKey` remains globally unique because it identifies a physical storage object rather than an application-domain identifier.

## Why OBO professional identifiers are scoped

`OboProfessional` is application-owned and already carries `appId`. A person may participate in more than one application context, so database uniqueness must not prevent equivalent application-local professional records from being represented independently.

`registrationNumber` is an OBO domain identifier and therefore belongs to the OBO application scope. `prcId` is retained as a unique credential reference within the application rather than imposing cross-application uniqueness.

## Migration

Migration:

`apps/api/prisma/migrations/20260916160000_scope_application_unique_constraints/migration.sql`

The migration removes the previous global unique indexes and creates application-scoped unique indexes. It does not backfill or infer ownership; ownership migration remains Phase 18.

## Service/seed impact

Compound unique constraints require Prisma compound selectors for `upsert`/`findUnique` operations that use these identifiers. The OBO reference seed and platform form seed now use `appId_*` selectors.

Repository lookups that already use `findFirst({ key, appId })` remain valid and continue to enforce application ownership.

## Security invariant

The combination of application-scoped repository filtering and application-scoped uniqueness provides:

```text
same identifier + different application = valid
same identifier + same application   = rejected
```

Cross-application isolation therefore does not depend on identifiers being globally unique.
