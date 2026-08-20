# Platform Integration

This document describes how shared business actions connect to reusable platform mechanisms without moving business decisions into `src/platform/`.

## Canonical flow

```text
module / feature service
        ↓
repository boundary
        ↓
atomic business operation
   ├── business state change
   └── event outbox entry
        ↓
platform worker
   ├── audit
   ├── rules
   └── notifications
```

The feature or module decides **when** an event is meaningful. The event bus decides **how** it is durably persisted and processed.

## Transactional events

Business events describing a persisted state change must be queued atomically with that state change. The persistence boundary is responsible for coordinating the transaction; business services should not bypass repositories with direct Prisma access.

Conceptually:

```text
service
  └── repository operation
        ├── business mutation
        └── outbox enqueue
```

This prevents a successful business mutation from losing its corresponding event because event publication happened afterward.

## Event consumers

The generic event processor provides reusable reactions for capabilities that are registered with the platform, including audit logging, configurable rules, notifications, and other platform consumers present in the current worker configuration.

A consumer must be explicitly registered and must remain domain-neutral. A module decides whether to publish an event; the platform does not invent domain workflows from event names.

## Domain neutrality

Event names and entity types may describe a domain concept when emitted by a feature or module. The platform must not interpret those names as application-specific workflows.

For example:

```text
case.created
case.transitioned
```

can be emitted by a shared feature. A module can emit its own domain events without requiring domain-specific code in the event bus.

## Worker responsibility

The platform worker is responsible for generic outbox delivery, queue processing, stale-lease recovery, and registered platform consumers. It must not contain domain-specific maintenance logic.

Domain-specific scheduled work belongs to the feature or module that owns the business rule and should use the platform scheduler/job mechanisms explicitly.
