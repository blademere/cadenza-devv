# Platform Hardening — Phase 1 Audit

**Base:** `development`
**Target:** `chore/platform-hardening`
**Scope:** `apps/api/src/platform`, platform Prisma schema, architecture enforcement, related tests/docs

## 1. Audit conclusion

The platform is already substantially established and should be hardened in place. No new domain-specific platform subsystem is justified by this audit.

The strongest existing foundations are:

- reusable platform capability boundaries under `apps/api/src/platform/`
- repository boundaries in several subsystems
- workflow versioning and optimistic concurrency protection
- transactional event outbox infrastructure
- shared HTTP request-ID middleware
- shared HTTP idempotency middleware
- BullMQ-backed jobs with retry/backoff defaults
- notification delivery idempotency and retry/dead states
- architecture validation preventing platform -> features/modules imports
- extensive platform/module architecture tests

The main weaknesses are consistency rather than absence of capability:

1. execution context is not standardized beyond `req.requestId`
2. correlation metadata is passed ad hoc through event/workflow payloads
3. some platform services access Prisma directly instead of consistently hiding persistence behind repositories
4. transaction boundaries are implemented per subsystem rather than through a consistent platform contract
5. event/job contracts are not yet standardized around one context/envelope model
6. observability is not represented as a common platform capability
7. architecture enforcement does not yet enforce the desired platform-service -> repository rule
8. platform security enforcement is partly route/static-analysis based rather than a complete service-level contract

## 2. Capability matrix

| Capability | Generic? | Repository | Transactions | Idempotency | Tests | Status |
|---|---:|---:|---:|---:|---:|---|
| Authorization | Yes | Yes | N/A | N/A | Yes | Harden |
| Workflow | Yes | Yes | Yes | Partial | Yes | Harden |
| Event Bus / Outbox | Yes | Partial | Yes | Yes | Yes | Harden |
| Jobs | Yes | N/A | N/A | Partial | Partial | Harden |
| Notifications | Yes | No dedicated repository boundary | Yes | Yes | Partial | Harden |
| Scheduler | Yes | N/A | Partial | Partial | Partial | Audit/Harden |
| Forms | Yes | Yes | Partial | Partial | Yes | Audit |
| Rules | Yes | Partial | N/A | Partial | Yes | Audit/Harden |
| Configuration | Yes | Partial | Partial | N/A | Partial | Audit |
| Audit | Yes | Yes | Caller-dependent | N/A | Yes | Harden |
| Documents | Yes | Yes/partial | Partial | Partial | Partial | Audit |
| Approvals | Yes | Yes/partial | Yes | Partial | Partial | Audit |
| Dashboards | Yes | Yes/partial | N/A | N/A | Partial | Audit |
| Integrations | Yes | Yes/partial | Partial | Yes/partial | Partial | Audit |
| Search | Yes | Yes/partial | N/A | N/A | Partial | Audit |
| SLA | Yes | Yes/partial | Partial | Partial | Partial | Audit |

`N/A` means the mechanism is not inherently required for the capability, not that the capability is incomplete.

## 3. Architecture findings

### 3.1 Platform boundary is currently respected

The architecture validator explicitly rejects platform imports of `features` and `modules`. It also rejects feature imports of modules and infrastructure imports of modules. This matches the intended dependency direction.

The existing architecture documentation also defines platform as the owner of reusable mechanisms and states that services should use repositories for persistence.

**Assessment:** PASS, but enforcement should be expanded in a later phase.

### 3.2 No domain-specific platform coupling found in the audited platform boundary

The platform directories are generic: approvals, audit, authorization, configuration, dashboards, documents, event-bus, forms, integrations, jobs, notifications, rules, scheduler, search, SLA, and workflow.

The OBO module consumes platform capabilities rather than the platform containing OBO-specific services. Existing OBO architecture tests explicitly protect this direction.

**Assessment:** PASS.

### 3.3 Repository boundary is inconsistent inside platform

Workflow has a repository, and audit has a repository, but `workflow.service.js` and `notification.service.js` still obtain the Prisma client directly. The workflow service uses its repository for reads but also performs transactional writes directly with Prisma. Notification service performs substantial persistence directly against Prisma, including notification rules, templates, deliveries, claims, and transactional upserts.

This is not an immediate architecture violation because the current validator only prohibits direct Prisma access from feature/module services. However, it does not yet enforce the stronger desired platform rule.

**Assessment:** GAP. Standardize repository boundaries before declaring platform persistence hardened.

### 3.4 Transaction handling exists but is not standardized

Workflow transition execution uses a transaction and an optimistic `updateMany` compare-and-set condition to prevent concurrent transitions. Workflow also writes history and the event/outbox record in the same transaction.

The event-outbox infrastructure already supports transactional enqueueing, and the database has an `EventOutbox` model.

Notification delivery also uses transactions for notification/delivery creation.

**Assessment:** STRONG FOUNDATION; standardize the contract rather than replacing existing mechanisms.

### 3.5 Request ID exists but execution context does not

The common `requestId` middleware accepts a bounded incoming `X-Request-ID` and generates a UUID when absent. It exposes the identifier on `req.requestId` and returns it as `X-Request-ID`.

There is no equivalent platform-level context carrying actor, organization/tenant, correlation ID, and metadata through service/event/job/workflow execution.

**Assessment:** GAP. This is the clearest Phase 2 candidate.

### 3.6 Correlation propagation is ad hoc

Event and workflow code already accepts `correlationId`/metadata in places, and notification idempotency derives a stable key from `context.correlationId`. However, there is no single context contract guaranteeing propagation.

**Assessment:** GAP. Phase 2/3 should consolidate existing fields rather than introduce a second request-ID mechanism.

### 3.7 Idempotency infrastructure already exists

Shared HTTP idempotency middleware is present and used by application routes. The architecture validator already checks mutation routes for idempotency middleware or explicit exemptions.

Notification delivery uses stable idempotency keys and unique persistence. Workflow event publication also supplies deterministic idempotency keys. Job enqueueing supports normalized job IDs.

The remaining issue is contract consistency across HTTP, events, and jobs; these mechanisms must remain distinct.

**Assessment:** STRONG FOUNDATION; standardize in Phase 5.

### 3.8 Event/outbox infrastructure is already materially implemented

The repository contains an event outbox service, Prisma `EventOutbox` schema, migrations, worker processing, stale recovery, and unit/integration tests. The event bus builds envelopes and publishes through the outbox path.

**Assessment:** STRONG FOUNDATION; harden failure semantics, ordering assumptions, correlation propagation, and duplicate handling.

### 3.9 Jobs already have retry/backoff support

The platform job service validates queues, normalizes job IDs, supports attempts, exponential backoff, delayed jobs, and cleanup policies. Notification delivery is registered as a job worker.

The current job abstraction does not itself define a persistent generic job-status/idempotency contract; queue state remains primarily delegated to BullMQ.

**Assessment:** PARTIAL. Do not add a second job engine. Harden the existing BullMQ abstraction and contract.

### 3.10 Workflow is the most mature platform subsystem

Workflow already has:

- workflow/version repositories
- definition validation
- published versions
- transactional creation/start/transition operations
- optimistic concurrency protection
- transition authorization
- history records
- audit records
- event/outbox publication
- module-owned workflow semantics

The main hardening requirement is to preserve the existing model while standardizing transaction/context boundaries.

**Assessment:** STRONG FOUNDATION; targeted hardening only.

## 4. Priority findings

### P0 — Do not duplicate existing mechanisms

Do not create a second request-ID system, idempotency system, event bus, job engine, or workflow engine.

### P1 — Standardize persistence boundaries

Add/complete repository boundaries for platform services where direct Prisma access is currently embedded in services. The platform may own transaction orchestration, but persistence operations should have a clear repository boundary.

### P1 — Standardize execution context

Introduce one platform context contract containing request ID, correlation ID, actor identity/type, organization/tenant context, and non-domain metadata.

### P1 — Harden event/outbox guarantees

Keep the existing outbox design. Verify atomicity, locking, retry, stale recovery, duplicate delivery, dead-letter behavior, and correlation propagation.

### P1 — Harden workflow concurrency/atomicity

Keep the existing compare-and-set transition mechanism and add explicit tests for concurrent transitions, transaction rollback, duplicate requests, and event publication failure.

### P2 — Observability

Add common structured logging/metrics/tracing primitives after context propagation is standardized.

### P2 — Architecture enforcement

Extend the existing validator to enforce platform service/repository boundaries and platform dependency rules without introducing domain coupling.

## 5. Phase 1 decisions

### Keep

- existing platform directory structure
- existing workflow engine
- existing event/outbox mechanism
- existing request-ID middleware
- existing HTTP idempotency middleware
- existing BullMQ job infrastructure
- existing notification idempotency model
- existing architecture validator
- existing platform architecture tests

### Harden

- context/correlation propagation
- platform repository boundaries
- transaction contracts
- event/job envelopes
- workflow concurrency/atomicity tests
- observability
- architecture enforcement
- service-level security enforcement

### Do not add

- `platform/obo`
- `platform/permits`
- `platform/professionals`
- `platform/receiving`
- `platform/plan-permits`
- `platform/applications`
- `platform/inspection`
- another idempotency implementation
- another event bus
- another job engine
- another workflow engine

## 6. Phase 1 exit criteria

Phase 1 is complete when:

- every existing platform subsystem has an explicit capability status
- direct platform -> module/feature dependencies are verified absent
- platform domain terminology is reviewed
- repository and transaction gaps are documented
- existing idempotency/event/job/workflow mechanisms are identified and reused
- the next phases are based on concrete gaps rather than assumed missing infrastructure

The audit satisfies these criteria. Implementation should proceed to **Phase 2 — Application/Request Context**.
