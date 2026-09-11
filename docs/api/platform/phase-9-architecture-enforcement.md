# Phase 9 — Architecture Enforcement

**Base:** `development`

**Target:** `chore/platform-hardening`

## Result

Phase 9 strengthens the existing architecture validator rather than introducing another architecture layer.

The enforced dependency direction remains:

```text
modules
  ↓
features
  ↓
platform
  ↓
infrastructure
```

## Enforced boundaries

The validator now explicitly checks:

```text
features       ✗ modules
platform       ✗ features/modules
infrastructure ✗ modules
common         ✗ features/platform/modules
```

The existing route rules remain enforced:

- state-changing routes require shared idempotency middleware unless explicitly exempted with justification
- resource routes require `authorizeResource` or an explicit resource authorization helper

## Platform persistence boundary

New platform services are prohibited from direct Prisma access.

Required boundary:

```text
platform service
      ↓
platform repository
      ↓
infrastructure / Prisma
```

Platform repositories may access Prisma because persistence is their responsibility.

## Legacy baseline

The branch already contains platform services that predate this enforcement and still access Prisma directly. They are tracked explicitly in `apps/api/scripts/architecture-rules.cjs` rather than silently ignored.

Current legacy baseline:

- `platform/approvals/approval.service.js`
- `platform/audit/audit.service.js`
- `platform/audit/audit.query.service.js`
- `platform/dashboards/dashboard.service.js`
- `platform/event-bus/event-outbox.service.js`
- `platform/forms/form.service.js`
- `platform/integrations/integration.service.js`
- `platform/notifications/notification.service.js`
- `platform/notifications/notification.send.service.js`
- `platform/rules/rule.service.js`
- `platform/rules/rule-execution.service.js`
- `platform/workflow/workflow.service.js`
- `platform/workflow/workflow-version.service.js`

These are technical-debt exceptions, not architectural permission. No new exception should be added.

When any legacy service is migrated to a repository boundary, remove it from the exception set in the same change.

## Why exceptions are explicit

Failing the entire hardening branch on every pre-existing platform persistence access would mix architecture enforcement with a broad persistence migration. Phase 9 instead establishes a hard boundary for new code while making the remaining debt visible and finite.

This keeps the phase focused on architecture enforcement and allows repository migrations to be completed incrementally without weakening the rule.

## Tests

Architecture behavior is covered by:

```text
apps/api/tests/unit/architecture/architecture-rules.test.js
```

The tests cover:

- platform → feature/module rejection
- feature → module rejection
- infrastructure → module rejection
- new platform-service Prisma rejection
- bounded legacy exceptions
- repository-owned Prisma access

## Follow-up

The legacy exceptions should be removed progressively. The highest-value candidates are platform services that already have a repository boundary or perform substantial transactional orchestration, especially workflow, forms, and audit.

Do not create domain-specific platform repositories or modules as part of this cleanup. Repositories should represent generic platform persistence only.
