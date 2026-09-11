# Phase 11 — Platform Configuration

## Objective

Provide one generic configuration boundary for platform-owned system and operational behavior without moving domain configuration into `platform`.

## Audit result

The application already has a validated environment configuration boundary in `apps/api/src/config/env.js`, but platform-owned settings were being read directly from `process.env` inside platform services. That made configuration access inconsistent and allowed platform configuration concerns to leak into implementation code.

Phase 11 does not introduce a database-backed settings system because the current application does not require persisted runtime configuration for the identified platform settings. Adding persistence without a concrete requirement would create unnecessary operational complexity.

## Boundary

```text
Environment / deployment configuration
              ↓
        config/env.js
              ↓
platform/configuration
              ↓
platform services
```

`config/env.js` remains responsible for parsing and validating environment input. `platform/configuration` exposes only configuration keys owned by reusable platform capabilities.

## Configuration namespaces

The platform boundary recognizes these generic namespaces:

- `system` — application-wide system settings.
- `operational` — runtime and operational settings.
- `platform` — reusable platform mechanism behavior.

The current implementation exposes platform authorization cache settings:

```text
authorization.cache.enabled
authorization.cache.trustPositive
```

These map to the validated environment variables `AUTHORIZATION_CACHE_ENABLED` and `AUTHORIZATION_CACHE_TRUST_POSITIVE`.

## Security-sensitive default

`authorization.cache.trustPositive` defaults to `false`.

PostgreSQL therefore remains authoritative for permission evaluation unless a deployment explicitly opts into trusting positive Redis cache entries. This prevents a stale positive cache entry from silently becoming an authorization grant after permission revocation.

## Domain ownership rule

Do not add domain configuration keys to the platform registry.

Incorrect:

```text
platform/configuration
└── planPermit.requireProfessionalVerification
```

Correct:

```text
modules/obo
└── domain-owned configuration
```

The platform may provide generic mechanisms for storing, validating, or evaluating configuration, but the consuming domain decides the meaning of domain-specific configuration.

## Persistence decision

No Prisma model or configuration repository is introduced in Phase 11.

A persisted configuration store should be added only when the application needs requirements such as:

- runtime changes without deployment;
- administrator-managed settings;
- tenant-scoped settings;
- configuration versioning/history;
- transactional configuration changes.

If that requirement appears, the persistence boundary should be:

```text
platform configuration service
        ↓
configuration repository
        ↓
Prisma / infrastructure
```

The service must remain domain-neutral and the repository must own persistence details.

## Rules

1. Environment variables are parsed and validated centrally in `config/env.js`.
2. Platform services must consume platform-owned settings through `platform/configuration`.
3. Platform configuration keys must be domain-neutral.
4. Domain-specific configuration remains owned by its module/feature.
5. Secrets must not be exposed through generic configuration listing APIs.
6. Configuration consumers should receive typed values rather than raw environment strings.
7. Do not add persistent configuration infrastructure until runtime persistence is required.

## Verification

Phase 11 adds a static contract test covering:

- generic configuration namespaces;
- platform-owned configuration keys;
- configuration boundary exports;
- domain-neutral configuration naming;
- authorization's use of the configuration boundary.

GitHub connector execution does not run the repository's local Vitest/PostgreSQL/Redis test suite, so runtime test execution still depends on the repository's CI or local development environment.
