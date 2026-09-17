# Application Domain — Phase 11 Authorization Integration

## Objective

Connect application-owned domain data to the application-owned authorization model without moving reusable feature code into `apps/obo`.

The security boundary is:

```text
User
  ↓
AppMembership
  ↓
App
  ↓
Role
  ↓
Permission
  ↓
Application Context
  ↓
Feature Repository
  ↓
appId
  ↓
Database
```

## Contract

1. Application routes establish an application context before protected application operations.
2. Authorization checks always evaluate permissions for the current `appId`.
3. Resource authorization loads the resource using the current application scope.
4. Application-owned repositories also filter by `appId`; authorization middleware is not the database isolation boundary.
5. Resource authorization performs a final `resource.appId` consistency check when the loaded resource exposes direct ownership.
6. OBO-specific authorization policy remains under `apps/obo/authorization` while the authorization mechanism remains under `platform/authorization`.

## Current implementation

### Application context

`requireApplicationContext()` resolves the application from the authenticated token/header, verifies active membership, rejects mismatched token/header application IDs, and places the application on `req.appContext` and `req.security.app`. It also propagates the application into the platform execution context.

### Permission evaluation

`platform/authorization/authorize.js` requires an application ID and passes it to the access-control service. Permission lookup is therefore performed against the user's membership and roles for that application.

### Resource authorization

`platform/authorization/authorization-resource.middleware.js` requires application context, performs the permission check with `appId`, and calls the resource loader with the request so application-specific loaders can pass `appId` to repositories.

After loading, a direct `resource.appId` is checked against the authorized application. A mismatch is treated as not found rather than exposing another application's resource.

### OBO application

The OBO router establishes `appKey: 'obo'` before entering OBO routes. OBO authorization routes use application-scoped authorization management. OBO permit-type and permit-application resource authorization loads records with `req.security.app.id`.

OBO authorization management keeps roles application-owned and validates that memberships and roles belong to the current application. OBO authorization modules/permissions remain shared catalog mechanisms, constrained to the `obo_` namespace by the OBO application service.

### Shared feature integration

Shared features remain in `features/*`. Their application-owned repositories require `appId` for scoped access. OBO passes its application ID when invoking cases, tasks, requirements, appointments, participants, forms, and documents.

For example, case reads require an application ID and query `CaseRecord` by both `id` and `appId`.

## Security invariant

A successful permission check does not grant access to a resource outside the current application.

Conversely, application ownership does not replace authorization. A caller must satisfy both:

```text
permission(user, appId, resource, action)
              AND
resource.appId == appId
```

For child records whose ownership is inherited through a parent, the repository must scope through the authoritative parent relationship.

## Testing

Phase 11 adds unit coverage for:

- permission checks receiving the application ID;
- resource loaders receiving the request/application context;
- cross-application resource rejection even when permission evaluation succeeds;
- denial when application context is absent.

Broader cross-application HTTP and repository isolation coverage belongs to Phase 12.

## Non-goals

Phase 11 does not:

- move shared features into `apps/obo`;
- make every platform/global record application-owned;
- replace repository ownership checks with middleware checks;
- finalize application-specific unique constraints;
- perform the production ownership backfill/migration.
