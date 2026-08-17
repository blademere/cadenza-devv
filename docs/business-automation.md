# Phase 3 — Business Automation

Phase 3 adds reusable business rules, approval policies, notification rules/templates, and SLA policies. These are platform capabilities; domain features such as permits provide the configuration and context.

## Business rules

Rules are event-driven and declarative. Conditions use a safe JSON DSL; arbitrary JavaScript is never executed.

```js
{
  event: "application.submitted",
  entityType: "PermitApplication",
  conditions: {
    all: [
      { field: "department", operator: "equals", value: "Finance" },
      { field: "amount", operator: "greater_than", value: 100000 }
    ]
  },
  actions: [
    { type: "REQUIRE_APPROVAL", policyKey: "finance-manager" }
  ]
}
```

Supported condition operators include `equals`, `not_equals`, `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal`, `in`, `not_in`, `contains`, `is_empty`, and `is_not_empty`. Conditions can be composed with `all`, `any`, and `not`.

## Approval policies

An approval policy is selected by entity type, priority, and conditions. Each policy contains ordered steps.

```js
await startApproval({
  subjectType: "PermitApplication",
  subjectId: application.id,
  context: applicationData,
})
```

Steps can currently target a specific user with `approverType: "USER"`. The model is intentionally extensible for role/permission based resolution later.

Approval instances move sequentially through their steps. Rejections terminate the instance; the final approval completes it. Concurrent actions use guarded updates to prevent double processing.

## Notifications

Templates define the channel and message. Rules select a template when an event occurs and resolve a recipient from a static value, a context field, or the current user.

```text
Event → matching rules → condition → recipient → NotificationDelivery
```

Templates use `{{ path.to.value }}` placeholders. Deliveries are queued in PostgreSQL; transport workers can later consume them for email, SMS, push, or webhook channels without changing the rule configuration.

## SLA

SLA policies define a duration, optional warning threshold, and optional escalation threshold. Instances are attached to a subject and store calculated timestamps.

```js
await startSla({
  subjectType: "PermitApplication",
  subjectId: application.id,
  workflowStepKey: "REVIEW",
})
```

Background jobs should periodically call `markDueSlas()` and `markEscalations()`. The service only changes SLA state; notification/escalation actions remain separate platform concerns.

## Architecture rule

Configuration describes business behavior. Platform services execute it. Domain features should not embed permit-specific amounts, approval chains, notification text, or SLA durations in controllers.

The next phase can add custom attributes, dashboards, webhooks/integrations, and richer workflow-event orchestration.
