# Application Domain Phase 4 — Tasks

## Ownership

`Task` is application-owned. It has a required `appId` foreign key to `App`.

Shared task code remains under `features/tasks`; application-specific orchestration remains under the owning application.

## Ownership rules

- Every task create operation requires `appId`.
- Every task read/list/update operation requires `appId`.
- A task with `caseId` may only reference a `CaseRecord` belonging to the same `appId`.
- Application ownership is never inferred from `createdByUserId` or `assigneeUserId`.
- Case ownership is authoritative for migration of existing tasks.

## Repository boundary

Task repository operations include `appId` in their lookup predicates. This prevents an application context from reading or mutating a task owned by another application.

## Case relationship

The application invariant is:

```text
Task.appId == CaseRecord.appId
```

when `Task.caseId` is present. The service validates this invariant before creating a task or moving a task to another case.

## Migration

The Phase 4 migration:

1. adds nullable `Task.appId`;
2. copies ownership from `Task.caseId -> CaseRecord.appId`;
3. fails when a task has no authoritative owner;
4. makes `appId` required;
5. adds application-scoped indexes;
6. adds the foreign key to `App`.

Tasks without a case are intentionally not assigned to an application by guessing from user identity. They must be resolved before the migration can complete.

## Non-goals

This phase does not move the tasks feature into `apps/obo`, redesign task workflow semantics, or change global uniqueness. Those concerns belong to later phases where applicable.
