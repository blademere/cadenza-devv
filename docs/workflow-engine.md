# Workflow Engine

The workflow engine is a reusable platform service. Domain features should describe a workflow instead of hard-coding status transitions in controllers and services.

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

A workflow instance stores `subjectType` and `subjectId`, so the engine can be reused by permits, applications, requests, inspections, or other business entities without a foreign key to a specific domain table.

## Creating a workflow

```js
const { createWorkflow } = require("../src/platform/workflow")

await createWorkflow({
  key: "building-permit",
  name: "Building Permit",
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
  workflowKey: "building-permit",
  subjectType: "PermitApplication",
  subjectId: application.id,
  actorId: user.id,
})
```

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

Existing applications continue using the workflow version they started with. New versions are created as drafts:

```js
const { createWorkflowVersion, publishWorkflowVersion } = require("../src/platform/workflow")

await createWorkflowVersion({
  workflowKey: "building-permit",
  steps: [...],
  transitions: [...],
  actorId: user.id,
})

await publishWorkflowVersion({
  workflowKey: "building-permit",
  version: 2,
  actorId: user.id,
})
```

Publishing archives the previously published version. Existing workflow instances remain attached to their original version.

## Audit

Workflow creation, instance creation, transitions, completion, and version changes are written to `AuditLog`. Other platform features can reuse:

```js
const { recordAudit } = require("../src/platform/audit/audit.service")
```

The audit record supports actor, action, entity, before/after snapshots, metadata, IP address, and user agent.

## Design rules

- Do not put permit-specific logic in the workflow engine.
- Do not execute arbitrary JavaScript from workflow configuration.
- Use `permissionKey` as a declarative hook for access-control integration.
- Keep business rules and conditions separate from transition mechanics; they will be added as the validation/rules platform is implemented.
- Never mutate a published workflow version. Create a new version instead.
