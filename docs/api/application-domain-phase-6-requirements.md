# Application Domain Ownership — Phase 6 Requirements

## Decision

`RequirementDefinition` is application-owned domain data, while `CaseRequirement` inherits application ownership through `CaseRecord`.

This keeps the reusable requirements capability in `features/requirements` without making the requirement catalog globally addressable across applications.

## Ownership

```text
App
└── RequirementDefinition

App
└── CaseRecord
    └── CaseRequirement
         └── RequirementDefinition
```

`RequirementDefinition.appId` is required. `CaseRequirement` intentionally has no duplicated `appId`; its owner is the application's `CaseRecord`.

## Repository boundary

All requirement-definition reads and writes require `appId`. Case-requirement reads and updates first scope through the parent case, and attachment operations require both the case and requirement definition to belong to the same application.

The service layer passes `appId` explicitly and never derives application ownership from the authenticated user or from a requirement identifier alone.

## OBO integration

OBO permit-type requirement configuration already has an application-scoped permit type. Phase 6 now resolves requirement definitions with that same `appId`, preventing an OBO permit type from attaching a definition owned by another application.

OBO plan-permit creation passes `appId` when resolving and attaching requirement definitions to its application-owned case.

## Migration

Migration `20260916170000_scope_requirements_to_application`:

1. adds nullable `RequirementDefinition.appId`;
2. backfills existing definitions to the authoritative `App(key = 'obo')` owner;
3. fails if any definition remains unowned;
4. makes `appId` required;
5. adds application indexes and the `(id, appId)` uniqueness support key;
6. adds the App foreign key with `RESTRICT` deletion.

No ownership is inferred from users, cases, or arbitrary metadata.

## Uniqueness

`RequirementDefinition.key` remains globally unique in this phase. Phase 13 will decide whether stable identifiers should become application-scoped composite unique constraints.

## Non-goals

- Do not move `features/requirements` into `apps/obo`.
- Do not add `appId` to `CaseRequirement` merely to duplicate inherited ownership.
- Do not change global identifier uniqueness yet.
- Do not treat `Person` or `User` as application-owned.
