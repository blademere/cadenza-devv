# Application Domain — Phase 12: Cross-App Isolation

## Objective

Verify that application-owned domain data cannot cross application boundaries even when callers know another application's record ID.

The primary isolation boundary is the repository/service layer. HTTP authorization remains defense-in-depth.

## Isolation contract

For an application-owned record:

```text
current appId
    ↓
repository query
    ↓
record.appId == current appId
```

For inherited child records, the repository scopes through the authoritative parent:

```text
CaseRequirement → Case.appId
CaseParticipant → Case.appId
FormVersion → Form.appId
AppointmentSlot → AppointmentType.appId
```

A missing or mismatched application scope must not resolve the record.

## Covered domains

The Phase 12 contract tests cover:

- Cases — direct `CaseRecord.appId` isolation
- Tasks — direct `Task.appId` isolation
- Requirements — `CaseRequirement` isolation through `Case.appId`
- Participants — `CaseParticipant` isolation through `Case.appId`
- Appointments — `AppointmentType` and `Appointment` application isolation
- Forms — `FormVersion` isolation through `Form.appId`
- Documents — application-owned documents are isolated; `appId = null` documents remain explicitly shared
- Audit — application context is persisted on audit records

Test file:

```text
apps/api/tests/unit/application-scope/cross-app-isolation.test.js
```

## Required behavior

### Read

An OBO context must not resolve an Admin-owned record by ID.

### List

Application-scoped list operations must include the current `appId` in their repository filter.

### Create

Application-owned records must persist the supplied application ownership and must validate parent ownership where applicable.

### Update/Delete

Mutation queries must include application ownership so an ID from another application cannot be updated or deleted.

### Nested resources

Child records must inherit ownership from their authoritative parent rather than trusting an unscoped child ID.

### Service-level access

Services must pass application context into feature repositories. A service call must not become a cross-app bypass merely because it is not reached through an HTTP route.

## Documents exception

Documents support an explicit shared state:

```text
appId = current application → application-owned
appId = null               → explicitly shared/global
appId = another application → inaccessible
```

This is intentional and must remain distinct from an application-owned document.

## Non-goals

Phase 12 does not:

- move reusable features into `apps/obo`
- change global `User` or `Person` ownership
- redesign authorization
- change application-scoped unique constraints
- perform the production ownership backfill

Those concerns remain in later phases.
