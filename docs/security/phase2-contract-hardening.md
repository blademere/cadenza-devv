# Phase 2 Security and API Contracts

This document defines the mandatory contracts for the existing Express application.

## 1. Access-token revocation semantics

Access tokens are short-lived bearer credentials and are **not individually persisted**. A logout operation revokes the current refresh token. A user-wide security event (password/security change, account disablement, refresh-token replay, or auth-version change) invalidates the user's refresh-token family and increments `authVersion` where applicable.

An already-issued access token can remain cryptographically valid until its normal expiration unless the request path performs an account-state/auth-version check. Therefore:

- refresh-token revocation is authoritative for session continuation;
- account deactivation must reject authenticated requests even when the JWT has not expired;
- privileged security changes must invalidate refresh sessions;
- do not claim instantaneous JWT revocation unless the route checks the current account state.

## 2. Audit taxonomy

Audit actions use stable lowercase dotted names. New mutations must select an existing action before introducing a new one.

### Authentication/security

- `auth.login`
- `auth.logout`
- `auth.refresh`
- `auth.refresh_replay`
- `auth.oauth_link`
- `auth.oauth_unlink`
- `security.account_disabled`
- `security.auth_version_changed`

### Authorization

- `authorization.role_changed`
- `authorization.permission_changed`
- `authorization.denied`

### Resource mutations

Use `<resource>.<verb>` for ordinary CRUD-style changes, for example:

- `user.created`
- `user.updated`
- `user.deleted`
- `appointment.created`
- `appointment.cancelled`
- `appointment.checked_in`
- `appointment.no_show`
- `appointment.completed`
- `appointment_type.created`
- `appointment_schedule.created`
- `appointment_slot.created`
- `appointment_slot.generated`

Security-sensitive events should include actor, resource ID, request metadata, and sanitized before/after state where available.

## 3. Transaction boundary contract

A mutation is one business operation and must be atomic when it changes multiple persistent resources.

A transaction is mandatory when a mutation:

1. changes a resource and writes its audit record;
2. changes state plus a counter/capacity/resource allocation;
3. creates an outbox/event record together with the domain mutation;
4. changes authorization state and invalidates related authorization cache/state;
5. changes multiple related rows where partial success would violate an invariant.

External network calls (email, OAuth providers, webhooks) must not be held inside a database transaction. Persist the durable intent first and perform external delivery through the appropriate worker/outbox boundary.

## 4. Idempotency contract

All state-changing HTTP APIs except interactive authentication login require an `Idempotency-Key`.

The key must be supplied by the caller and must identify one logical mutation. A retry with the same key and equivalent request must return the original result rather than creating another resource or repeating a side effect.

The server must reject key reuse with a different request payload rather than silently treating it as the original operation.

## 5. Resource authorization contract

RBAC answers **whether a principal may perform an action on a module**. Resource authorization answers **whether this principal may perform that action on this specific resource**.

Resource endpoints must use both where ownership/context matters:

```text
authenticate
  -> module permission
  -> resource lookup
  -> resource policy / ownership
  -> controller
```

Services may retain scoped queries as defense in depth, but route-level resource authorization must not be replaced by a caller-supplied resource ID check.

## 6. Appointment invariants

Appointment configuration and slot APIs must reject:

- non-IANA timezones;
- schedules whose end is not after start;
- slot durations larger than the schedule window;
- slots whose end is not after start;
- generation windows whose `to` is not after `from`;
- list ranges whose `to` is not after `from`;
- non-positive capacities or durations.

Booking capacity is enforced atomically at the database boundary. Application-level checks alone are insufficient.
