# OBO Module

This directory contains the domain documentation for the OBO plan-permit application module.

The module owns permit-specific business rules and composes reusable features and platform mechanisms. Generic architecture rules remain in [`../../architecture.md`](../../architecture.md).

## Domain scope

The OBO module covers application-specific permit concepts such as permit types, permit applications, professional registration, receiving decisions, and submission appointments.

Professional signing of hardcopy documents is an offline business process and is not an application signing workflow.

## Architecture boundary

```text
OBO module
    ↓
shared features
    ↓
platform mechanisms
    ↓
infrastructure
```

The module must not create parallel implementations of shared appointments, forms, workflow, events, authorization, or persistence mechanisms.

## Documentation

- [Plan permit workflow](plan-permit-workflow.md)

Keep additional OBO-specific requirements, workflows, state definitions, API behavior, and domain decisions in this directory rather than in general repository documentation.
