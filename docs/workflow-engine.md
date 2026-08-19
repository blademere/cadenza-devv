# Workflow Engine

The workflow engine is a reusable platform service. Domain modules define the business meaning of a workflow; the platform owns versioning, transition mechanics, concurrency protection, and history.

## Model

```text
Workflow
  └── WorkflowVersion
       ├── WorkflowStep
       └── WorkflowTransition

WorkflowInstance
  ├── current step
  └── WorkflowHistory[]
```

A workflow instance stores `subjectType` and `subjectId`, allowing the engine to support cases, applications, requests, inspections, or other business entities without a foreign key to a specific domain table.

## Creating a workflow

The platform accepts domain-neutral configuration. A future module may supply a key such as `building-permit`, but that key is module configuration rather than platform business logic.

```js
await createWorkflow({
  key: "application-review",
  name: "Application Review",
  steps: [
    { key: "draft", name: "Draft", isInitial: true },
    { key: "review", name: "Review" },
    { key: "approved", name: "Approved", isFinal: true },
  ],
  transitions: [
    {
      key: "submit",
      name: "Submit",
      fromStepKey: "draft",
      toStepKey: "review",
    },
    {
      key: "approve",
      name: "Approve",
      fromStepKey: "review",
      toStepKey: "approved",
      permissionKey: "applications:approve",
    },
  ],
  actorId: user.id,
})
```

## Starting an instance

```js
const instance = await startWorkflow({
  workflowKey: "application-review",
  subjectType: "Application",
  subjectId: application.id,
  actorId: user.id,
})
```

A future OBO module can use `subjectType: "PermitApplication"`; the platform must remain unaware of the permit domain.

## Transaction-aware operations

Domain services that need to atomically combine workflow persistence with their own database writes can supply an existing Prisma transaction client through `db`:

```js
await prisma.$transaction(async (tx) => {
  const workflow = await startWorkflow({
    workflowKey: "application-review",
    subjectType: "Application",
    subjectId: application.id,
    actorId: user.id,
    db: tx,
  })

  await repository.update(application.id, {
    workflowInstanceId: workflow.id,
  }, tx)
})
```

Likewise, transitions support the same transaction boundary:

```js
await prisma.$transaction(async (tx) => {
  const workflow = await transitionWorkflow({
    instanceId: application.workflowInstanceId,
    transitionKey: "approve",
    actorId: user.id,
    db: tx,
  })

  await repository.recordApproval(application.id, user.id, tx)
})
```

When `db` is omitted, the workflow service owns its own transaction as before. When `db` is supplied, the caller owns the transaction and the workflow history, event publication, audit record, and domain writes can commit or roll back together.

## Transitioning

```js
await transitionWorkflow({
  instanceId: instance.id,
  transitionKey: "submit",
  actorId: user.id,
  metadata: { source: "client-api" },
})
```

Transitions are checked against the instance's current step. The update also uses the current step as an optimistic concurrency condition, preventing two concurrent requests from advancing the same instance from the same state.

## Versioning

Existing instances continue using the workflow version with which they started. New versions are created as drafts and published explicitly.

Publishing archives the previously published version. Existing workflow instances remain attached to their original version. Published workflow versions are immutable.

## Audit

Workflow creation, instance creation, transitions, completion, and version changes should be recorded through the reusable audit capability. The workflow engine should not introduce domain-specific audit semantics.

## Design rules

- Do not put permit-specific, rental-specific, enrollment-specific, or other module-specific logic in the workflow engine.
- Do not execute arbitrary JavaScript from workflow configuration.
- Use `permissionKey` as a declarative access-control hook.
- Keep business rules and conditions separate from transition mechanics.
- Use guarded updates for lifecycle transitions that must be concurrency-safe.
- When a domain operation combines workflow and domain writes, prefer a caller-owned `db` transaction.
- Never mutate a published workflow version; create a new version instead.
- Keep persistence behind the platform's repository boundary.
