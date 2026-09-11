# Phase 10 — Platform Security Hardening

## Scope

Phase 10 hardens the generic authorization and audit mechanisms used by features and modules.

The security boundary remains:

```text
Authentication
      ↓
Authorization
      ↓
Resource access / policy
      ↓
Audit
```

Business authorization decisions remain owned by the consuming feature/module. Platform provides the reusable enforcement mechanism.

## Authorization cache safety

PostgreSQL remains the authoritative permission source by default.

Positive Redis permission-cache hits are **not trusted by default** because a stale positive entry can survive a permission or role revocation if cache invalidation is delayed or unavailable.

The environment setting:

```text
AUTHORIZATION_CACHE_TRUST_POSITIVE=true
```

is an explicit opt-in for deployments that can guarantee timely permission-cache invalidation.

Cache failures do not grant access. Authorization falls through to PostgreSQL.

## Route enforcement

The existing `validate-authorization.cjs` validator remains mandatory for routes under:

- `features`
- `modules`
- `platform`

Routes must contain authentication and authorization middleware unless they are explicitly classified as:

- public
- an authentication boundary
- the authorization context endpoint

These exceptions must be visible in route source rather than silently bypassing the validator.

## Resource authorization

`authorizeResource` enforces both:

1. the resource/action permission; and
2. an optional resource policy such as ownership.

The resource is loaded only after the permission check succeeds.

A policy denial is treated as a security decision and is separately classified as `resource_policy_denied` in the audit metadata.

## Authorization denial audit

Denied authorization decisions are recorded through the generic audit platform as:

```text
AUTHORIZATION_DENIED
```

Audit metadata includes, when available:

- authorization resource
- requested action
- denial reason
- request ID
- correlation ID
- actor
- client IP
- user agent

Audit failure is best effort. An unavailable audit store must never convert a denied request into an allowed request.

## Security-sensitive mutation coverage

Existing application services already use `recordAudit` for many security-sensitive state changes. Phase 10 adds a common denial audit path so rejected authorization decisions are also observable.

Successful business mutations remain responsible for their domain-specific audit records.

## OBO and other modules

OBO continues to own its permissions and policies. Examples such as `obo_plan_permits` remain module-level authorization vocabulary consumed through the platform mechanism.

No `platform/obo`, `platform/permits`, `platform/professionals`, or other domain-specific security modules are introduced.

## Security invariants

The platform must preserve these invariants:

```text
No authenticated context
        → deny

No required permission
        → deny

Resource policy fails
        → deny

Authorization cache unavailable
        → evaluate authoritative source

Audit store unavailable
        → original authorization decision remains unchanged

Explicit public/auth-boundary route
        → allowed only through visible validator exemption
```

## Verification

Phase 10 adds static security contract tests covering:

- fail-closed authorization caching
- authoritative permission evaluation
- denial auditing
- resource-policy denial auditing
- route authentication/authorization enforcement

GitHub connector access does not execute the repository's full Vitest/PostgreSQL/Redis suite. Runtime verification should be performed by the repository's CI/local test environment.
