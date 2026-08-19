# Business Automation Platform

This document describes reusable business-automation mechanisms that remain available for future application features and domain modules. These mechanisms are **not part of the current OBO product implementation** and should be treated as deferred/reusable platform capabilities until a real domain consumer requires them.

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

Domain modules provide the business context and configuration. Platform services execute generic mechanisms. The platform does not decide when a permit or other domain needs an automation.

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

## Approval policies — deferred

Approval policies remain implemented as a reusable platform mechanism, but the repository does not currently treat generic approvals as an active product workflow.

An approval policy is selected by entity type, priority, and conditions. Each policy contains ordered steps.

```js
await startApproval({
  subjectType: "Application",
  subjectId: application.id,
  context: applicationData,
})
```

Do not interpret the existence of this service as proof that OBO evaluation is a generic approval workflow. OBO may eventually require evaluation and inspection decisions with domain-specific semantics.

## Notifications

Templates define the channel and message. Rules can select a template when an event occurs and resolve a recipient from a static value, a context field, or the current user.

```text
Event → matching rules → condition → recipient → NotificationDelivery
```

Templates use `{{ path.to.value }}` placeholders. Delivery persistence and transport remain separate concerns so a module does not need to know which provider sends email, SMS, push, or webhook notifications.

For email, the current infrastructure provider is Resend. The notification platform remains provider-neutral and should not import the Resend client directly.

## SLA — deferred

SLA policies define a duration, optional warning threshold, and optional escalation threshold. Instances are attached to a subject and store calculated timestamps.

```js
await startSla({
  subjectType: "Application",
  subjectId: application.id,
  workflowStepKey: "REVIEW",
})
```

This capability remains deferred until the actual service-level requirements of a domain are defined.

## Current status

The following capabilities are retained as reusable mechanisms but are not automatically part of the public application API:

```text
rules          available / reusable
approvals      deferred
notifications  available / reusable
SLA            deferred
```

Do not create a generic `business-automation` aggregator to expose these services as one platform abstraction. Consumers should depend on the specific capability they actually need.

## Architecture rules

1. Configuration describes business behavior; platform services execute it.
2. Domain-specific approval chains, notification text, monetary thresholds, and SLA durations belong to the module/configuration layer.
3. Platform rules must not contain permit-specific, rental-specific, enrollment-specific, or OBO-specific assumptions.
4. Do not execute arbitrary code from stored configuration.
5. Keep rule evaluation, workflow mechanics, notifications, audit, and external integrations composable rather than creating one domain-specific automation framework.
6. Do not expose a reusable platform capability as a public API merely because its service exists.

This document is intentionally capability-oriented. The current roadmap calls for integrating these mechanisms only when a concrete feature or domain module has a real reuse requirement.
