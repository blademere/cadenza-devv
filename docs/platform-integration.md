# Platform Integration

Phase 3 establishes how shared business actions connect to reusable platform mechanisms without moving business decisions into `src/platform/`.

## Canonical flow

```text
controller / module service
        ↓
feature service
        ↓
feature repository
        ↓
transaction
   ├── business state change
   └── event outbox entry
        ↓
platform worker
   ├── audit
   ├── rules
   └── notifications
```

The feature or module decides **when** an event is meaningful. The event bus decides **how** it is persisted and processed.

## Transactional events

Business events that describe a persisted state change should be queued in the same database transaction as that state change.

Example:

```js
await prisma.$transaction(async (tx) => {
  const record = await tx.caseRecord.update(...)

  await publish({
    db: tx,
    event: 'case.transitioned',
    entityType: 'Case',
    entityId: record.id,
    actorId,
    context: { ... },
  })
})
```

This prevents a successful business mutation from losing its corresponding event because event publication happened afterward.

## Event consumers

The generic event processor currently provides reusable reactions for:

- audit logging
- configurable rules
- notifications

Deferred capabilities such as SLA, approvals, and webhooks are not implicit event-bus side effects. They can be integrated later by an explicit module or platform integration when a real use case requires them.

## Domain neutrality

Event names and entity types may describe a domain concept when emitted by a feature or module. The platform must not interpret those names as application-specific workflows.

For example:

```text
case.created
case.transitioned
```

are emitted by the shared `cases` feature. A future OBO module may emit:

```text
permit.application.submitted
permit.application.received
```

without requiring permit-specific code in the event bus.

## Worker responsibility

The platform worker is responsible for generic outbox delivery, queue processing, and stale lease recovery. It must not contain domain-specific maintenance logic.

Domain-specific scheduled work belongs to the feature or module that owns the business rule and should use the platform scheduler/job mechanisms explicitly.
