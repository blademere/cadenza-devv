# Platform Extensibility

Phase 4 adds configuration-driven custom attributes, dashboards, integrations, and webhooks.

## Custom fields

Custom fields are metadata definitions scoped by entity type. Values are stored separately from the domain entity so permit-specific or organization-specific attributes do not require schema changes.

```js
await customFields.defineField({
  entityType: "PermitApplication",
  key: "risk_category",
  label: "Risk Category",
  type: "select",
  config: { options: ["LOW", "MEDIUM", "HIGH"] },
})

await customFields.setValue({
  entityType: "PermitApplication",
  entityId: application.id,
  key: "risk_category",
  value: "HIGH",
})
```

Supported types are `text`, `number`, `integer`, `boolean`, `date`, `datetime`, `select`, `multiselect`, and `json`.

Do not use custom fields for core relational data such as applicant identity, permit type, workflow state, or professional registration. Those remain normal domain columns and relations.

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

The next integration step is to connect domain events to:

```text
Domain event
   ├── Business rules
   ├── Notifications
   ├── SLA
   ├── Webhooks
   └── Audit
```

Keep the event dispatcher generic and keep each consumer isolated. This prevents permit-specific behavior from leaking into the platform engines.
