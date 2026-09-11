# Platform Idempotency Model

Idempotency is a reliability contract across multiple execution boundaries. The boundaries are related, but they are not one mechanism.

```text
HTTP idempotency
      ≠
event deduplication
      ≠
job retry protection
```

## 1. HTTP commands

Use the existing shared `idempotency` middleware for client-retryable state-changing HTTP commands.

The contract is:

1. Client supplies `Idempotency-Key`.
2. Middleware validates and scopes the key.
3. Redis atomically claims the key with `SET NX`.
4. Concurrent reuse receives `409 Conflict`.
5. A different request fingerprint with the same key receives `409 Conflict`.
6. Successful responses are retained and replayed.
7. Server errors release the claim.
8. Claim completion/release is protected by an ownership token.

The middleware must remain generic. It does not know whether the command is a permit submission, approval, user operation, or another domain action.

### Scope

The effective HTTP idempotency identity includes:

```text
application scope
organization/tenant
actor/user
HTTP method
route
Idempotency-Key
request fingerprint
```

The raw key is hashed before being placed in the Redis key.

### Expiration

Completed entries use the configured completed-entry TTL. In-progress claims use a separate TTL so short application TTLs do not immediately allow concurrent duplicate execution.

Both values are bounded.

## 2. Events

Event idempotency belongs to the event infrastructure.

The transactional outbox can use an idempotency key to prevent duplicate event creation, while consumers must remain safe under at-least-once delivery.

An HTTP `Idempotency-Key` must not be copied into an event as if it were the event's deduplication identity.

Use event identity/correlation/causation and consumer-specific deduplication as appropriate.

## 3. Jobs

Job retry protection belongs to the job infrastructure and processor contract.

A job should have a stable job identity when duplicate enqueueing must be prevented, and the processor must tolerate retries. Queue attempts, backoff, and failure/dead-letter state are operational reliability controls rather than HTTP idempotency.

Do not use an HTTP idempotency key as a job retry mechanism unless the consuming domain explicitly maps the command to a stable job identity.

## 4. Required route behavior

Mutation routes should use the shared HTTP middleware unless there is a documented reason for exemption.

Examples:

```text
POST   /resources
POST   /resources/:id/submit
POST   /resources/:id/approve
POST   /resources/:id/decline
PATCH  /resources/:id
DELETE /resources/:id
```

A route may be exempt only when retrying the operation is unsafe or when the operation has an independent, stronger idempotency guarantee. The exemption must be explicit and justified.

## 5. Platform boundary

The platform provides the reliability mechanism.

Features and modules decide:

- whether a command is retryable
- which idempotency scope it uses
- what business operation the command performs
- whether an independent domain-level deduplication rule is required

The platform must not contain domain-specific idempotency keys such as `planPermitSubmissionKey` or `professionalVerificationKey`.
