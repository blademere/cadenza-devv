# OBO Plan Permit Workflow

The OBO plan-permit module uses the reusable platform workflow engine. It does not implement a second state-transition mechanism in OBO services.

## Workflow definition

The seeded workflow key is `obo_plan_permit`, version `1`:

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

`DECLINED` and `FOR_INSPECTION` are terminal steps for this workflow version.

## Ownership

```text
OBO module
  ├── validates permit-specific business rules
  ├── validates the hardcopy submission appointment
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

The OBO application stores `workflowInstanceId` as its association to the workflow instance. The workflow instance's current step is the authoritative lifecycle state.

The existing `status` column is a compatibility representation and must not become a second state machine.

## Permissions

Workflow transition permissions use the `resource:action` convention:

- `obo_plan_permits:submit`
- `obo_plan_permits:schedule_submission`
- `obo_plan_permits:receive`

Receiving officers use `obo_plan_permits:receive` for receiving and final receiving decisions.

## Seeding

The workflow definition is seeded by `scripts/db-seed.cjs`. Workflow version `1` is seeded idempotently.

Do not create OBO-specific workflow tables or a second OBO state machine. Future lifecycle changes should be represented by a new published platform workflow version.
