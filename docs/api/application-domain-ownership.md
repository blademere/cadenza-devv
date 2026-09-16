# Application Domain Ownership Audit

**Branch:** `refactor/application-scoped-domain-data`

**Baseline:** `development` at `13f4313b932769b3e0b26987586a13aa68f32d4e`

**Phase:** 0 — Audit / freeze current architecture

## Purpose

This document freezes the ownership findings that must drive the application-scoped domain-data refactor. It separates code ownership from data ownership: reusable features remain shared, while application-owned records must carry an explicit application boundary or inherit one from an application-owned parent.

## Current architecture observations

- The repository already separates OBO application/module code from reusable business capabilities. OBO permit workflows live under the OBO module while cases, tasks, requirements, participants and appointments are implemented as shared capabilities.
- The Prisma schema is split between `platform` and OBO module schema files. The baseline contains `CaseRecord`, `Task`, appointments, requirements, participants and generic forms as shared/platform models.
- `AuditLog` already has nullable `appId`, an `App` relation, and application-oriented indexes. Audit therefore needs integration verification rather than a new ownership mechanism.
- OBO-specific permit application and permit type records are currently modeled under the OBO module and use globally unique reference/key fields. Their ownership is intrinsically OBO today; Phase 2 must decide whether explicit `appId` is required for the final multi-application model or whether their OBO-specific model boundary is sufficient.
- Current shared `CaseRecord` and `Task` models do not contain `appId`. `CaseRecord` owns tasks, participants, requirements and status history; `Task` can optionally reference a case. This is the primary ownership gap for shared workflow data.
- Shared appointment models (`AppointmentType`, `AvailabilitySchedule`, `AppointmentSlot`, `Appointment`) currently have no `appId`; several identifiers are globally unique. This requires a dedicated ownership and uniqueness decision before migration.
- Generic `Form` is shared infrastructure/capability, but OBO permit types use it for application-specific form definitions. Form ownership must therefore be separated from the reusable form engine.
- `CaseRequirement` and case participants are naturally scoped through `CaseRecord`; direct `appId` is not automatically required if the repository always resolves through an application-owned case.

## Ownership matrix — baseline decision record

| Entity | Current layer | Target ownership | Direct `appId` | Ownership source / decision |
|---|---|---|---|---|
| `User` | platform | Global | No | Global identity |
| `Person` | platform | Global | No | Shared identity/person record |
| `App` | platform | Global | No | Application registry |
| App membership / role / permission assignments | platform | Application | Yes / through App | Existing application authorization model |
| `OboPermitType` | OBO module | OBO application | Review in Phase 2 | Intrinsically OBO; final model should support application ownership consistently |
| `OboPermitApplication` | OBO module | OBO application | Review in Phase 2 | Intrinsically OBO; references an OBO case |
| `OboProfessional` | OBO module | OBO application | Review in Phase 2 | OBO domain data |
| OBO client records | OBO module | OBO application | Review | Verify whether client is a domain record or a reference to global `Person` |
| OBO receiving records | OBO module | OBO application | Review | Parent application supplies ownership |
| OBO submission appointment records | OBO module | OBO application | Inherited | `OboPermitApplication` owns the association |
| `CaseType` | platform | Review | Review | Determine whether case taxonomy is global or application catalog |
| `CaseRecord` | platform | Application | **Yes** | Primary shared application-owned record |
| `CaseStatusHistory` | platform | Application-inherited | No initially | Owned through `CaseRecord`; direct `appId` only if query/constraint needs it |
| `Task` | platform | Application | **Yes** | Direct app boundary plus case consistency |
| `CaseParticipant` | platform | Application-inherited | No initially | Inherits through `CaseRecord`; global `Person` remains shared |
| `CaseRequirement` | platform | Application-inherited | No initially | Inherits through `CaseRecord` |
| `RequirementDefinition` | platform | Review | Review | Decide global catalog vs per-application catalog |
| `AppointmentType` | platform | Application | **Yes** | Appointment configuration belongs to application |
| `AvailabilitySchedule` | platform | Application-inherited | No initially | Inherits through `AppointmentType` |
| `AppointmentSlot` | platform | Application-inherited | No initially | Inherits through `AppointmentType` |
| `Appointment` | platform | Application | **Yes** | Direct booking ownership; must agree with type/slot application |
| `Form` | platform | Application | **Yes** | Form definitions are application-owned data; form engine remains shared |
| `FormVersion` | platform | Application-inherited | No initially | Owned through `Form` |
| Form sections/fields/options | platform | Application-inherited | No initially | Owned through `FormVersion` |
| Documents | platform / OBO | Review | Review | Classify global artifact vs application/case/requirement association |
| `AuditLog` | platform | Contextual | **Already present** | Nullable `appId` supports global and application-context events |
| Workflow definitions/engine | platform | Shared mechanism; data review | Review | Keep engine shared; inspect whether definitions/instances need app ownership |

## Repository/query audit findings

The baseline contains repository access patterns that currently identify shared records by global primary key alone. Examples confirmed during the audit include:

- Cases: repository lookup is currently by case id without an application predicate.
- Tasks: repository lookup is currently by task id; task creation can validate a case by id without an application predicate.
- Requirements: case validation and case-requirement queries currently use `caseId` without an application boundary.
- Participants: case validation currently resolves a case by id, while the person remains global.

These are not safe application boundaries once shared records become multi-application data. Later phases must change the service/repository contracts so application ownership is explicit and enforced at the persistence boundary.

## Global uniqueness audit — baseline hotspots

The following globally unique fields are known ownership candidates and must be reviewed before migrations:

- `CaseRecord.caseNumber`
- `AppointmentType.key`
- `Appointment.referenceNumber`
- OBO `OboPermitType.key`
- OBO `OboPermitApplication.referenceNumber`
- Generic `Form.key`

Do not automatically change all of these to composite uniqueness. Phase 13 must determine whether each identifier is intentionally global or only unique within an application.

## Code ownership decision

The audit freezes the following architectural rule:

```text
Application-specific behavior/data model
    -> apps/<application> or existing OBO module

Reusable business capability
    -> features/*

Reusable infrastructure/mechanism
    -> platform/*
```

Shared feature code must accept application context as data (`appId` or an equivalent application context object at the service boundary), not import an OBO application module and not depend directly on Express request objects.

## Explicit non-goals for Phase 0

- No Prisma schema changes.
- No data migration.
- No repository behavior changes.
- No moving `features/*` into `apps/obo`.
- No authorization redesign; Phase 11 integrates the already-established application authorization model with domain ownership.

## Phase 0 exit criteria

- [x] Baseline branch created from the specified development commit.
- [x] Application vs shared code ownership rule frozen.
- [x] Initial entity ownership matrix recorded.
- [x] Primary missing application boundaries identified.
- [x] Global uniqueness hotspots identified for later review.
- [x] Repository-level implicit ownership risks identified.
- [ ] Requirement-definition ownership explicitly decided in Phase 6.
- [ ] Document ownership explicitly decided in Phase 9.
- [ ] Workflow data ownership explicitly audited before migration.

## Next phase

Phase 1 establishes the common ownership model and migration conventions without yet converting every domain entity. The first implementation targets should be the shared records whose application ownership is unambiguous: `CaseRecord`, `Task`, appointment records, and `Form`.
