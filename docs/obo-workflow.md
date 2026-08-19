# OBO Plan Permit Workflow

The OBO plan permit module consumes the reusable platform workflow engine. It does not implement a second state-transition mechanism in the OBO services.

## Workflow definition

The seeded workflow key is `obo_plan_permit` and version `1` contains:

```text
DRAFT
  │ SUBMIT_FOR_SUBMISSION
  ▼
READY_FOR_SUBMISSION
  │ SCHEDULE_SUBMISSION
  ▼
SUBMISSION_SCHEDULED
  │ RECEIVE_HARDCOPY
  ▼
RECEIVING
  ├── DECLINE ───────────────► DECLINED
  └── ACCEPT_FOR_INSPECTION ─► FOR_INSPECTION
```

`DECLINED` and `FOR_INSPECTION` are terminal workflow steps for this lifecycle version.

## Ownership

The boundaries are:

```text
OBO module
  ├── validates permit-specific business rules
  ├── validates the hardcopy appointment
  ├── records receiving decisions
  └── invokes platform workflow transitions

Platform workflow
  ├── validates available transitions
  ├── checks transition permissions
  ├── performs guarded state changes
  ├── records workflow history
  ├── publishes workflow events
  └── records workflow audit entries
```

The OBO application stores `workflowInstanceId` as the association to its workflow instance. The authoritative lifecycle state is the workflow instance's `currentStep.key`.

The existing `status` column remains as a compatibility field during this migration, but OBO service decisions must not use it as the lifecycle source of truth. Responses derive `status` from the workflow current step.

## Permissions

Workflow transition permission keys use the same `resource:action` format as the authorization system:

- `obo_plan_permits:submit`
- `obo_plan_permits:schedule_submission`
- `obo_plan_permits:receive`

Receiving officers use the same `obo_plan_permits:receive` permission for receiving and final receiving decisions because both operations are part of the receiving capability.

## Seeding

The workflow definition is seeded by `scripts/db-seed.cjs`. The seed is idempotent for workflow version `1` and its transitions.

Do not create OBO-specific workflow tables or a second OBO state machine. Future OBO lifecycle changes should be represented as a new published platform workflow version rather than modifying a published version in place.
