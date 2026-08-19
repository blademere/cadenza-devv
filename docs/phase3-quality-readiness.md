# Phase 3 — Quality and Readiness Contracts

This document records the repository-level decisions made during Phase 3. These rules apply to existing features and are mandatory for future modules.

## 1. Public readiness

The application exposes three health endpoints:

- `GET /health` — service health information.
- `GET /health/live` — liveness probe.
- `GET /health/ready` — readiness probe for required dependencies.

Readiness responses must not expose credentials, connection strings, internal exception messages, stack traces, or infrastructure secrets. Detailed dependency diagnostics belong in server logs and monitoring, not in the public HTTP response.

Production deployments should treat `/health/live` as the process liveness signal and `/health/ready` as the dependency-readiness signal. Monitoring credentials and metrics remain separately protected.

## 2. OAuth hardening contract

The current OAuth implementation uses:

- high-entropy random `state` values;
- Redis-backed, single-use state records;
- short state expiration windows;
- separate login and account-link state cookies;
- constant-time state-cookie comparison;
- provider binding in stored state;
- callback URL configuration from the server environment;
- HTTP-only, secure/same-site OAuth state cookies according to deployment configuration;
- refresh-token issuance only after the provider authorization code has been exchanged and the application account operation succeeds.

OAuth state is consumed with an atomic Redis `GETDEL` operation, preventing callback replay. Provider credentials and callback URLs are never accepted from the browser.

Future OAuth changes must preserve these properties. Do not add a `returnUrl` or provider-controlled redirect parameter without an explicit server-side allowlist.

## 3. Appointment URL decision

Appointments remain a **shared business feature** and are currently exposed at:

```text
/api/v1/appointments
```

This is intentional. Appointment scheduling is independently reusable business functionality, not generic platform infrastructure.

The generic appointment API must remain limited to the appointment capability itself. A future domain module may compose appointments for a domain-specific workflow, but it should not duplicate the scheduling engine or create a second appointment implementation.

When a domain module requires a domain-specific endpoint, that endpoint should live under the domain module and call the appointment feature service through an explicit application boundary. The generic `/appointments` API should not be renamed or moved merely to anticipate a future module.

## 4. DTO/mapper contract

Controllers are the HTTP boundary. They must not serialize arbitrary persistence objects directly.

The required flow is:

```text
HTTP request
  -> validation
  -> controller
  -> service
  -> repository
  -> persistence

persistence result
  -> service
  -> controller mapper/DTO
  -> HTTP response
```

Response mappers must explicitly select fields exposed by the API. Sensitive persistence-only fields must never be exposed merely because they exist on a Prisma result.

The appointments feature now demonstrates this convention with `appointment.mapper.js`. New feature endpoints should add explicit mappers for their response contracts rather than returning repository records directly.

Request validation remains the responsibility of Zod validation middleware. Mappers are not a substitute for request validation.

## 5. Quality gate

Phase 3 changes are complete only when all of the following remain green:

```bash
npm run lint
npm run test:unit
npm run test:integration
node scripts/validate-openapi.cjs
npm audit --omit=dev --audit-level=high
```

The public README must describe observable, tested behavior rather than planned capabilities. Architecture decisions belong in `docs/architecture.md` and phase-specific security/readiness contracts belong in dedicated documentation such as this file.
