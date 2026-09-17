# Phase 2 — OBO Core Application Ownership

## Scope

Phase 2 makes the clearly OBO-owned core records explicitly owned by the OBO `App` record.

### Direct application ownership

- `OboPermitType.appId`
- `OboPermitApplication.appId`
- `OboProfessional.appId`

Each direct owner has a foreign key to `App` and an application index.

## Inherited ownership

These OBO records remain owned through their parent `OboPermitApplication` and do not duplicate `appId` in this phase:

- `OboReceivingDecision`
- `OboSubmissionAppointment`
- `OboPermitApplicationDocument`
- OBO permit-type requirement associations
- professional verification decisions

A child operation must first resolve the parent through the current application context before operating on the child.

## Global entities intentionally unchanged

- `User`
- `Person`

An OBO client is currently represented by a global `Person` referenced by `OboPermitApplication.clientPersonId`; no application ownership is added to `Person`.

## Repository boundary

OBO repositories now require `appId` for direct core-record reads and mutations. HTTP controllers obtain it from `req.security.app.id` established by `requireApplicationContext`.

Examples:

```js
repository.findById(id, appId)
repository.findByKey(key, appId)
repository.listActive(appId)
repository.findByPersonId(personId, appId)
```

Application creation writes the authenticated application id into the new OBO record rather than relying on the caller to select an arbitrary application.

## Migration

The Phase 2 migration:

1. adds nullable `appId` columns,
2. backfills existing OBO records from `App.key = 'obo'`,
3. fails if ownership cannot be established,
4. makes `appId` required,
5. adds indexes, and
6. adds foreign keys to `App`.

Global uniqueness is deliberately retained until Phase 13. This avoids mixing ownership migration with the later decision about whether identifiers such as permit keys, reference numbers, and professional registration numbers should be globally or application scoped.

## Non-goals

Phase 2 does not yet add application ownership to:

- Cases
- Tasks
- Appointments
- Requirement definitions
- Forms
- shared Documents
- Participants

Those phases must establish their own direct or inherited ownership boundaries.

## Reference architecture

```text
OBO App
  │
  ├── OboPermitType.appId
  ├── OboPermitApplication.appId
  └── OboProfessional.appId
          │
          ├── receiving decisions
          ├── submission appointment
          └── application documents

Global
  ├── User
  └── Person
```
