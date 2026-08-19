# Business Automation Platform

This document describes reusable business-automation mechanisms available to application features and future domain modules. It is a platform capability, not a permit-specific implementation.

The architectural relationship is:

```text
Domain/module action
        ↓
feature or module service
        ↓
rules / approvals / notifications / SLA
        ↓
event and job infrastructure
```

Domain modules provide the business context and configuration. Platform services execute the generic mechanism.

## Business rules

Rules are event-driven and declarative. Conditions use a safe JSON DSL; arbitrary JavaScript is never executed.

```js
{
  event: "application.submitted",
  entityType: "Application",
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

A future domain module may use a subject such as `PermitApplication`, but that identifier belongs to the module, not to the platform engine.

Supported condition operators include `equals`, `not_equals`, `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal`, `in`, `not_in`, `contains`, `is_empty`, and `is_not_empty`. Conditions can be composed with `all`, `any`, and `not`.

## Approval policies

An approval policy is selected by entity type, priority, and conditions. Each policy contains ordered steps.

```js
await startApproval({
  subjectType: "Application",
  subjectId: application.id,
  context: applicationData,
})
```

Steps can currently target a specific user with `approverType: "USER"`. The model is intentionally extensible for role/permission-based resolution later.

Approval instances move sequentially through their steps. Rejections terminate the instance; final approval completes it. Guarded updates prevent concurrent actions from double-processing the same approval step.

## Notifications

Templates define the channel and message. Rules select a template when an event occurs and resolve a recipient from a static value, a context field, or the current user.

```text
Event → matching rules → condition → recipient → NotificationDelivery
```

Templates use `{{ path.to.value }}` placeholders. Delivery persistence and transport remain separate concerns so a module does not need to know which provider sends email, SMS, push, or webhook notifications.

## SLA

SLA policies define a duration, optional warning threshold, and optional escalation threshold. Instances are attached to a subject and store calculated timestamps.

```js
await startSla({
  subjectType: "Application",
  subjectId: application.id,
  workflowStepKey: "REVIEW",
})
```

Background jobs can periodically evaluate due and escalation states. The SLA service changes SLA state; notification and escalation actions remain separate platform concerns.

## Architecture rules

1. Configuration describes business behavior; platform services execute it.
2. Domain-specific approval chains, notification text, monetary thresholds, and SLA durations belong to the module/configuration layer.
3. Platform rules must not contain permit-specific, rental-specific, enrollment-specific, or OBO-specific assumptions.
4. Do not execute arbitrary code from stored configuration.
5. Keep rule evaluation, workflow mechanics, notifications, audit, and external integrations composable rather than creating one domain-specific automation framework.

This document is intentionally capability-oriented. The current roadmap calls for integrating these mechanisms with the Phase 2 shared foundations before implementing a concrete domain module.
