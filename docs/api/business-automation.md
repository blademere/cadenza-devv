# Business Automation Platform

This document describes reusable business-automation mechanisms. Domain modules provide business context and configuration; platform services execute generic mechanisms.

## Architecture

```text
Domain/module action
        ↓
feature or module service
        ↓
rules / approvals / notifications / SLA
        ↓
event and job infrastructure
```

The platform does not decide when a domain needs an automation.

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

Supported condition operators include `equals`, `not_equals`, `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal`, `in`, `not_in`, `contains`, `is_empty`, and `is_not_empty`. Conditions can be composed with `all`, `any`, and `not`.

## Approval policies

Approval policies are reusable platform mechanisms. An approval policy is selected by entity type, priority, and conditions and contains ordered steps.

```js
await startApproval({
  subjectType: "Application",
  subjectId: application.id,
  context: applicationData,
})
```

Approval semantics remain owned by the consuming feature or module. The platform does not turn a generic approval policy into a domain-specific workflow.

## Notifications

Templates define the channel and message. Rules can select a template when an event occurs and resolve a recipient from a static value, a context field, or the current user.

```text
Event → matching rules → condition → recipient → NotificationDelivery
```

Templates use `{{ path.to.value }}` placeholders. Delivery persistence and transport remain separate concerns so consumers do not need to know which provider sends email, SMS, push, or webhook notifications.

The notification platform remains provider-neutral; provider-specific delivery belongs behind infrastructure boundaries.

## SLA

SLA policies define a duration, optional warning threshold, and optional escalation threshold. Instances are attached to a subject and store calculated timestamps.

```js
await startSla({
  subjectType: "Application",
  subjectId: application.id,
  workflowStepKey: "REVIEW",
})
```

SLA semantics are configured by the consuming feature or module.

## Public API boundary

These mechanisms are reusable internal capabilities. Their existence does not automatically make them public application APIs.

Do not create a generic `business-automation` aggregator. Consumers should depend on the specific capability they actually need.

## Architecture rules

1. Configuration describes business behavior; platform services execute it.
2. Domain-specific approval chains, notification text, monetary thresholds, and SLA durations belong to the module/configuration layer.
3. Platform rules must not contain application-specific assumptions.
4. Do not execute arbitrary code from stored configuration.
5. Keep rule evaluation, workflow mechanics, notifications, audit, and external integrations composable.
6. Do not expose a reusable platform capability as a public API merely because its service exists.
