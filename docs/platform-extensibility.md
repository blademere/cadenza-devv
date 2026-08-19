# Platform Extensibility

This document describes reusable platform mechanisms that can support future application modules. These capabilities remain available in the repository, but dashboards and integrations/webhooks are currently deferred and are not public application APIs.

The architectural rule is:

```text
module-specific business decision
            ↓
       feature/service
            ↓
       platform engine
            ↓
 infrastructure/provider
```

The platform provides mechanisms; modules decide when and why those mechanisms apply.

## Dynamic form fields

Dynamic/custom fields are part of the Forms platform. There is no separate `platform/custom-fields` subsystem.

```text
Form
 └── FormVersion
      ├── FormSection
      └── FormField
           └── FormOption
```

A module defines the form it needs and the Forms platform handles field definition, validation, conditional visibility, options, versioning, and submissions. Field values for an application are stored with the submission/application and are interpreted against the exact `FormVersion` used.

Use dynamic fields for genuinely variable or organization-specific attributes. Do not use them for core relational data such as applicant identity, case relationships, participant roles, permit type, workflow state, or professional registration. Those remain normal domain columns and relations.

For OBO permit applications, `OboPermitType.formId` points to the generic platform `Form`. A permit-specific field such as `risk_category`, `occupancy`, `estimated_cost`, or equipment capacity is a normal `FormField` in that form version.

## Dashboards — deferred

Dashboard configuration remains a reusable capability but is not a current product API. A dashboard is a configuration object containing ordered widgets. A widget has a type and JSON configuration, allowing a frontend to render known widget types without hardcoding dashboard composition in the backend.

The platform stores configuration only; it does not execute arbitrary SQL from widget configuration. Query execution should be implemented by a controlled server-side widget registry when a real dashboard consumer exists.

## Integrations and webhooks — deferred

Integrations describe external systems without storing raw secrets in the database. `secretRef` is an identifier for a secret in the application's secret manager/environment.

Webhook endpoints can subscribe to named domain events. Durable delivery records and HMAC-SHA256 payload signing remain reusable mechanisms for a future integration consumer.

These capabilities are intentionally deferred because the current application has no concrete OBO integration requirement.

## Event architecture

The intended integration is:

```text
Domain/module action
        │
        ▼
   Domain event
        ├── Business rules
        ├── Notifications
        ├── SLA / scheduled work
        ├── Webhooks
        └── Audit
```

Keep the event dispatcher generic and keep each consumer isolated. Permit-specific, rental-specific, enrollment-specific, or other domain behavior must remain in the corresponding module.

## Extensibility status

The repository no longer uses a `platform/extensibility.js` aggregator or a separate custom-field capability. Consumers should import the specific capability they need rather than depending on an artificial extensibility facade.

Current status:

```text
forms           retained / reusable
rules/events    retained / reusable
dashboards       deferred
integrations    deferred
webhooks        deferred
```

## Extensibility rules

1. Keep platform APIs domain-neutral.
2. Do not add a platform abstraction for a single module unless the abstraction has a real reuse case.
3. Do not move module business rules into platform services just because several handlers use the same mechanism.
4. Keep provider-specific behavior behind infrastructure/platform adapters.
5. Prefer small composable mechanisms over large generic frameworks.
6. Preserve the dependency direction documented in [`architecture.md`](architecture.md).
7. Do not expose a reusable capability as a public API root unless there is a concrete application consumer.
