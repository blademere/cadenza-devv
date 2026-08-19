# Mutation Hardening

All state-changing application APIs must follow these rules:

1. **Authorization**: require authentication, RBAC permission, and resource-level policy where a resource identifier is present.
2. **Idempotency**: externally callable state-changing operations must require `Idempotency-Key` unless the operation is explicitly documented as naturally idempotent.
3. **Transactions**: a business mutation and its audit record must commit atomically when they share the same database transaction.
4. **Audit**: create, update, delete, status-transition, credential, authorization, and other security-sensitive mutations must emit a typed audit event.
5. **Concurrency**: mutations that consume a finite resource must use an atomic database operation or equivalent concurrency control and test contention.

## Audit event taxonomy

Audit actions use uppercase, resource-oriented names:

- `*_CREATED`
- `*_UPDATED`
- `*_DELETED`
- `*_RESTORED`
- `*_STATUS_CHANGED`
- `*_CANCELLED`
- `*_AUTHENTICATED`
- `*_AUTHORIZATION_DENIED`
- `*_SECURITY_EVENT`

Appointment lifecycle actions use the more specific existing names such as `APPOINTMENT_CREATED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_CHECKED_IN`, `APPOINTMENT_COMPLETED`, and `APPOINTMENT_NO_SHOW`.

Audit payloads must never contain credentials, tokens, secrets, or cookies; the audit service redacts these values before persistence.
