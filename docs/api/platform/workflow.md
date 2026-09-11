# Platform Workflow

The Platform Workflow service provides a generic workflow execution mechanism. Domain modules define their own workflow keys, steps, transitions, and permission requirements; the platform owns execution guarantees.

## Guarantees

### Transition atomicity

A transition is executed as one database transaction:

```text
Validate transition
      ↓
Authorize transition
      ↓
Conditional state update
      ↓
Workflow history
      ↓
Transactional outbox event
      ↓
Commit
```

The instance update is conditional on the state observed before execution. If another request changes the instance first, the update affects zero rows and the platform raises a conflict instead of recording a second transition from stale state.

### Event consistency

Workflow transition events are published through the event bus using the transaction client. The state change, history row, and outbox record therefore commit or roll back together.

### Concurrency

Workflow instances use optimistic concurrency at the state boundary. Callers that receive a concurrent-transition conflict should reload the instance and retry only when the business operation is still valid.

### Version safety

Workflow versions follow the generic configuration lifecycle:

```text
DRAFT → VALIDATED → PUBLISHED → ARCHIVED
                              ↘
                                PUBLISHED (rollback)
```

Published and archived versions are immutable. Only one published version is permitted for a workflow at the database boundary through a partial unique index. This prevents concurrent publication from leaving multiple active versions.

Existing workflow instances retain their selected `workflowVersionId`; publishing a new version does not silently move existing instances to the new definition.

### Auditability

Workflow history records:

- workflow instance
- previous step
- new step
- transition
- actor
- correlation ID
- timestamp
- optional domain metadata

The correlation ID is sourced from the platform execution context and is also propagated through the workflow event envelope.

## Domain boundary

Modules remain responsible for deciding when a workflow should start or transition and for defining domain-specific workflow states.

The platform must not introduce domain workflow implementations such as `platform/plan-permit-workflow` or `platform/receiving-workflow`.
