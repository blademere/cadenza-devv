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

The platform accepts domain-neutral configuration. Workflow keys, steps, transitions, and permission keys are supplied by the consuming module/configuration; the platform does not interpret domain-specific meanings.

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

The platform remains unaware of the business domain represented by `subjectType` and `subjectId`.

## Transaction boundary

A domain operation that must atomically combine a workflow transition with domain persistence must use the repository/application transaction boundary. Business services must not bypass that boundary by calling Prisma directly.

Conceptually:

```text
service
  └── transaction boundary
        ├── workflow repository operation
        └── domain repository operation
```

The transaction must commit or roll back workflow history, event/outbox records, audit records, and domain persistence together when they form one business operation.

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

- Do not put module-specific business logic in the workflow engine.
- Do not execute arbitrary JavaScript from workflow configuration.
- Use `permissionKey` as a declarative access-control hook.
- Keep business rules and conditions separate from transition mechanics.
- Use guarded updates for lifecycle transitions that must be concurrency-safe.
- Keep persistence behind repository boundaries.
- Never mutate a published workflow version; create a new version instead.
