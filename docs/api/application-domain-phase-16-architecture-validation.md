# Application Domain Phase 16 — Architecture Validation

## Objective

Make the application-scoped architecture enforceable rather than relying on convention.

## Dependency direction

Allowed:

```text
apps/* → features/*
apps/* → platform/*
features/* → platform/*
```

Forbidden:

```text
features/* → apps/*
platform/* → apps/*
platform/* → features/*
platform/* → modules/*
features/* → modules/*
```

Application code is the composition boundary. Shared features and platform mechanisms must not depend on an application implementation.

## Application security boundaries

`platform/applications` remains domain-neutral. OBO-specific authorization and application policy remain under `apps/obo`.

Shared features must not import the authorization repository directly or bypass platform authorization/context APIs.

## Application-scoped repositories

The validator identifies repositories for the application-owned shared capabilities:

- cases
- tasks
- appointments
- requirements
- participants
- forms

These repositories must expose or enforce an `appId` ownership boundary. This is a structural guard; repository behavior tests remain responsible for proving actual query isolation.

## Service persistence boundary

Application, feature, and platform services remain prohibited from direct Prisma access. Persistence belongs behind repositories or an explicit infrastructure boundary.

## Route enforcement

Existing architecture checks continue to require idempotency handling for mutations and resource authorization for resource routes.

## Phase 16 result

The architecture validator now explicitly rejects application imports from shared layers and requires an ownership signal in application-scoped repositories. This protects the intended separation:

```text
OBO application
      ↓
shared feature capability
      ↓
application-scoped repository
      ↓
appId
      ↓
database
```
