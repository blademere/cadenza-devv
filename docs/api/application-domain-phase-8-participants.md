# Application Domain Phase 8 — Participants

## Objective

Keep `features/participants` reusable while making participant access application-safe through the owning `CaseRecord`.

## Ownership model

`Person` remains global. A `CaseParticipant` does not receive a duplicated `appId`; its ownership is inherited through:

```text
CaseParticipant
    ↓
CaseRecord.appId
    ↓
App
```

This means an OBO participant is accessible only when the referenced case belongs to the OBO application.

## Repository boundary

The participant repository now requires `appId` for all case-scoped operations:

- add
- list
- find
- remove
- case validation

The repository filters participant reads and deletes through `caseRecord.appId`, and participant creation first verifies that the case belongs to the supplied application.

## Service boundary

The reusable participant service boundary requires `appId` and passes it to the repository. It does not depend on Express request objects.

The OBO plan-permit application supplies its authenticated application context when associating applicants and professionals with an OBO case.

## Cross-application isolation

An application cannot use a participant identifier or case identifier to access another application's participant membership. A case belonging to another application resolves as not found at the participant service boundary.

## Schema decision

No `appId` column is added to `CaseParticipant` in this phase. Duplicating ownership would create two sources of truth because `CaseRecord` is already application-owned.

The existing participant uniqueness rule remains:

```prisma
@@unique([caseId, personId, roleKey])
```

Application-specific uniqueness changes are deferred to Phase 13.

## Code ownership

Participants remain a shared feature:

```text
apps/obo
    ↓
features/participants
    ↓
CaseParticipant
    ↓
CaseRecord.appId
```

No OBO-specific participant implementation is introduced.
