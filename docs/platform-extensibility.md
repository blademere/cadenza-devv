# Platform Extensibility

This document describes reusable platform mechanisms that can support future application modules. It does not define a specific business domain.

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

## Custom fields

Custom fields are metadata definitions scoped by entity type. Values are stored separately from the domain entity so genuinely variable or organization-specific attributes do not require schema changes.

```js
await customFields.defineField({
  entityType: 'PermitApplication',
  key: 'risk_category',
  label: 'Risk Category',
  type: 'select',
  config: { options: ['LOW', 'MEDIUM', 'HIGH'] },
})

await customFields.setValue({
  entityType: 'PermitApplication',
  entityId: application.id,
  key: 'risk_category',
  value: 'HIGH',
})
```

Supported types are `text`, `number`, `integer`, `boolean`, `date`, `datetime`, `select`, `multiselect`, and `json`.

Do **not** use custom fields for core relational data such as applicant identity, case relationships, participant roles, permit type, workflow state, or professional registration. Those remain normal domain columns and relations.

Dynamic forms and custom fields complement the strongly modeled shared features; they do not replace them.

## Dashboards

A dashboard is a configuration object containing ordered widgets. A widget has a type and JSON configuration, allowing the frontend to render known widget types without hardcoding dashboard composition in the backend.

Widgets can declare a `permissionKey`. The backend can filter a dashboard with `getDashboardForPermissions()` before returning it to the client.

The platform stores configuration only; it does not execute arbitrary SQL from widget configuration. Query execution should be implemented by a controlled server-side widget registry.

## Integrations and webhooks

Integrations describe external systems without storing raw secrets in the database. `secretRef` is an identifier for a secret in the application's secret manager/environment.

Webhook endpoints subscribe to named domain events. `queueEvent()` creates durable delivery records. A worker can later read `getDueDeliveries()`, perform the HTTP request, and call `markSent()` or `markFailed()`.

Payloads can be signed using HMAC-SHA256:

```js
const signature = signPayload({ payload, secret })
```

The secret must come from a secure runtime secret store, not from the webhook endpoint row.

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

## Extensibility rules

1. Keep platform APIs domain-neutral.
2. Do not add a platform abstraction for a single module unless the abstraction has a real reuse case.
3. Do not move module business rules into platform services just because several handlers use the same mechanism.
4. Keep provider-specific behavior behind infrastructure/platform adapters.
5. Prefer small composable mechanisms over large generic frameworks.
6. Preserve the dependency direction documented in [`architecture.md`](architecture.md).
