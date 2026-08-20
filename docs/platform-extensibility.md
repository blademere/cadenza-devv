# Platform Extensibility

This document describes reusable platform mechanisms and the boundaries for adding new capabilities.

## Architectural rule

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

## Dynamic forms and custom fields

Dynamic/custom fields are part of the Forms platform. There is no separate `platform/custom-fields` subsystem.

```text
Form
 └── FormVersion
      ├── FormSection
      └── FormField
           └── FormOption
```

A module defines the form it needs and the Forms platform handles field definition, validation, conditional visibility, options, versioning, and submissions. Use dynamic fields for genuinely variable or organization-specific attributes, not stable relational concepts.

## Dashboards

Dashboard configuration is a reusable platform capability. A dashboard contains ordered widgets, and each widget has a type and JSON configuration. The platform stores configuration but does not execute arbitrary SQL from widget configuration.

Dashboard query execution must use controlled server-side widget implementations. Dashboard services are not automatically public APIs.

## Integrations and webhooks

Integrations describe external systems without storing raw secrets in the database. `secretRef` identifies a secret managed by the application's configuration/secret boundary.

Webhook endpoints subscribe to named domain events. Durable delivery records and HMAC-SHA256 payload signing are reusable mechanisms; consumers must explicitly register the events and delivery behavior they need.

## Event architecture

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

Keep the event dispatcher generic and each consumer isolated. Domain behavior must remain in the corresponding module or feature.

## Extensibility rules

1. Keep platform APIs domain-neutral.
2. Do not add a platform abstraction for a single module without a real reusable capability.
3. Do not move module business rules into platform services merely because several handlers use the same mechanism.
4. Keep provider-specific behavior behind infrastructure boundaries.
5. Prefer small composable mechanisms over large generic frameworks.
6. Preserve the dependency direction documented in [`architecture.md`](architecture.md).
7. Do not expose a reusable capability as a public API root unless there is a concrete application consumer.
8. Keep configurable form fields inside the Forms capability rather than recreating a custom-field subsystem.
