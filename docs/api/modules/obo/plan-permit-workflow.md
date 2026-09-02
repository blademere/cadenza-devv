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

A declined application cannot be submitted again through its existing workflow instance. The client creates a new permit application when reapplying; the new application starts a fresh `DRAFT` workflow instance.

## Professional verification

A professional must complete the Professional area verification application before being selectable on a permit application. The verification submission requires:

- professional registration number;
- PRC ID;
- PTR number.

The verification record starts as `PENDING_VERIFICATION`. A Receiving Officer reviews the submitted credentials and records an `ACCEPTED` or `DECLINED` decision. Declines require a reason. Only professionals with status `VERIFIED` may be associated with permit applications.

The verification decision is recorded in `OboProfessionalVerificationDecision`, while the current verification status remains on `OboProfessional`.

## Permit application

Permit application fields remain dynamic and are validated through the reusable Forms/FormVersion platform capability. A permit application stores its resolved form version and submitted `formValues` rather than introducing permit-specific columns for every form field.

The client selects an available verified professional while creating or editing a draft. The application service rejects unverified professionals even if a caller bypasses the frontend.

## Submission appointments

Hard-copy submission appointments use the shared platform appointment capability. Appointment types, availability schedules, slot duration, slot capacity, and individual slots are configured outside the OBO workflow. Booking claims slot capacity transactionally.

A client can schedule the hard-copy submission only after the application reaches `READY_FOR_SUBMISSION`. Booking the appointment transitions the application to `SUBMISSION_SCHEDULED`.

## Hard-copy receiving

The Receiving Officer can receive an application only when:

- the workflow is `SUBMISSION_SCHEDULED`;
- a valid submission appointment exists;
- the appointment has started and is not cancelled or a no-show;
- the associated professional is still `VERIFIED`.

Receiving transitions the application to `RECEIVING`. The physical hard-copy documents are handled at the office; the client does not upload those hard-copy submission documents as part of this workflow.

## Receiving decision

From `RECEIVING`, the Receiving Officer can:

- `DECLINE` the application, with a required reason; or
- `ACCEPT_FOR_INSPECTION`, which moves the application to `FOR_INSPECTION`.

`FOR_INSPECTION` is the end of this Plan Permit phase. Professional signing is not an application workflow operation; professional signatures remain part of the physical hard-copy process.

## Ownership

```text
OBO module
  ├── validates permit-specific business rules
  ├── validates professional verification requirements
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

Platform appointments
  ├── configures availability
  ├── creates bookable slots
  ├── enforces capacity
  └── records appointment lifecycle

Platform forms
  ├── defines reusable permit form schemas
  ├── versions published forms
  └── validates dynamic application values
```

The OBO application stores `workflowInstanceId` as its association to the workflow instance. The workflow instance's current step is the authoritative lifecycle state.

## Permissions

Workflow transition permissions use the `resource:action` convention:

- `obo_plan_permits:submit`
- `obo_plan_permits:schedule_submission`
- `obo_plan_permits:receive`

Receiving officers use `obo_plan_permits:receive` for receiving and final receiving decisions. Professional verification uses the `obo_professionals` resource permissions for creation, read access, and review.

## Seeding

The workflow definition is seeded by `scripts/db-seed.cjs`. Workflow version `1` is seeded idempotently.

Do not create OBO-specific workflow tables or a second OBO state machine. Lifecycle changes should be represented by a new published platform workflow version.
