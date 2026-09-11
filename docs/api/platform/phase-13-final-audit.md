# Phase 13 — Platform Hardening Final Audit

## Scope

Final documentation and architecture audit for the `chore/platform-hardening` branch against `development`.

The audit covers the platform hardening phases, dependency boundaries, reliability contracts, security/configuration boundaries, and documentation index.

## Final platform capability matrix

| Capability | Generic | Repository boundary | Transaction boundary | Idempotency / retry | Tests | Final status |
| --- | :---: | :---: | :---: | :---: | :---: | --- |
| Authorization | ✓ | ✓ | — | — | ✓ | Hardened |
| Workflow | ✓ | Existing repository boundary + tracked legacy Prisma debt | ✓ | Optimistic concurrency | ✓ | Hardened |
| Event Bus | ✓ | Outbox persistence boundary | ✓ when caller supplies transaction client | Outbox dedupe + bounded delivery retry | ✓ | Hardened |
| Jobs | ✓ | Queue infrastructure | — | Bounded attempts + exponential backoff | ✓ | Hardened |
| Notifications | ✓ | Existing repository boundary | Existing service behavior | Existing delivery idempotency + retry | Existing + hardening coverage | Hardened |
| Scheduler | ✓ | Existing service boundary | Existing behavior | N/A | Existing + instrumentation | Audited |
| Forms | ✓ | Existing repository boundary | Existing behavior | Existing application contract | Existing | Audited |
| Rules | ✓ | Existing platform persistence boundary | N/A | N/A | Existing | Audited |
| Configuration | ✓ | Not persisted; environment boundary | N/A | N/A | ✓ | Hardened |
| Observability | ✓ | N/A | N/A | N/A | ✓ | Hardened |
| Audit | ✓ | Existing persistence boundary | Caller-controlled | N/A | Existing + security contract coverage | Hardened |

`Repository boundary` reflects the current implementation and intentionally does not claim that every legacy platform service has already been migrated. Phase 9 tracks remaining direct-Prisma platform services explicitly as technical debt.

## Dependency audit

Required direction:

```text
modules → features → platform → infrastructure
```

The architecture validator enforces:

- features must not import modules;
- platform must not import features or modules;
- infrastructure must not import modules;
- common must not import features, platform, or modules;
- feature/module services must not access Prisma directly;
- new platform services must not access Prisma directly;
- mutation routes must use shared idempotency middleware unless explicitly exempted;
- resource routes must use resource authorization or an explicit authorization helper.

The validator contains a bounded legacy exception list for pre-existing platform Prisma access. New exceptions are not part of the architecture contract.

## Reliability audit

### Context and correlation

Request and correlation IDs are initialized at the HTTP boundary and restored across asynchronous job/event execution. Actor metadata is enriched by authentication without adding domain state to the generic context.

### Transactions and outbox

State changes and their required outbox records can share the same transaction client. Outbox delivery uses leases, lock ownership, bounded retries, stale recovery, and a terminal `DEAD` state.

### Idempotency

The implementation keeps separate contracts for:

```text
HTTP idempotency
      ≠
event deduplication
      ≠
job retry protection
```

HTTP idempotency uses atomic Redis claims and ownership-safe completion/release. Event and job consumers remain responsible for duplicate-safe business execution.

### Workflow

Workflow transitions use conditional state updates, transactional history/outbox persistence, correlation-aware history, and a database-enforced single published-version invariant.

### Events and jobs

Event delivery and queue execution have separate retry budgets. Event payloads have durable event identity and reserved platform context. Job workers restore execution context before invoking processors.

## Security audit

The security boundary is:

```text
Authentication
      ↓
Authorization
      ↓
Resource / policy access
      ↓
Audit
```

Authorization defaults to PostgreSQL as the authoritative permission source unless positive-cache trust is explicitly enabled. Authorization and resource-policy denials are audited without allowing audit failures to turn a denial into an allow decision.

## Configuration audit

Environment variables are validated centrally by `config/env.js`. Platform-owned settings are exposed through `platform/configuration`.

No domain configuration has been added to the platform. No persistent configuration store was introduced because runtime-managed configuration is not currently required.

## Documentation audit

The platform documentation set is now:

```text
docs/api/platform/
├── overview.md
├── context.md
├── correlation.md
├── events.md
├── jobs.md
├── workflow.md
├── idempotency.md
├── observability.md
├── architecture-rules.md
├── phase-1-audit.md
├── phase-7-event-job-reliability.md
├── phase-8-observability.md
├── phase-9-architecture-enforcement.md
├── phase-10-security-hardening.md
├── phase-11-configuration.md
└── phase-13-final-audit.md
```

`docs/api/architecture.md` is the authoritative cross-layer architecture contract. `docs/api/platform/overview.md` is the platform-specific entry point.

## Verification status

The branch comparison shows `chore/platform-hardening` is ahead of `development` with no commits behind at the time of this audit.

Static architecture tests and platform contract tests have been added throughout the hardening phases. The GitHub connector does not execute the repository's local Vitest, PostgreSQL, or Redis test environment, and there are no corresponding GitHub Actions workflow runs available for the latest hardening commits. Therefore this audit distinguishes static/code-level verification from runtime test execution.

Runtime verification remains required before merging:

1. install dependencies from the branch;
2. run Prisma generation/validation and applicable migrations in a controlled environment;
3. run the architecture validator;
4. run platform unit tests;
5. run event/outbox integration tests with PostgreSQL;
6. run idempotency/job tests with Redis/BullMQ;
7. run the complete API test suite;
8. inspect CI results before merge.

## Known remaining technical debt

The hardening work does not claim to have completed every platform persistence migration. The explicitly listed legacy platform services with direct Prisma access remain candidates for future repository extraction.

The workflow version publication path also has a follow-up consideration: configuration publication events should be reviewed if the application requires strict database-state/event atomicity for those lifecycle operations.

These are follow-up hardening items, not reasons to introduce domain-specific platform modules.

## Final architecture rule

Platform remains a reusable mechanism layer:

```text
Module / Feature
      ↓
Platform mechanism
      ↓
Infrastructure
```

Domain meaning stays in modules/features. Platform provides the reusable implementation and operational guarantees.
