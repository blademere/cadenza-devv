# Generic Scheduler

The repository contains a thin generic scheduling abstraction over BullMQ. It schedules background jobs; it is **not** the appointment slot-generation engine.

Appointment types, availability schedules, slot duration, capacity, slot generation, and appointment lifecycle belong to `src/features/appointments/` because those are business capabilities. The generic scheduler remains deferred until a concrete cross-domain background scheduling requirement exists.

## Every interval

```js
const { scheduleEvery } = require('../src/platform/scheduler/scheduler.service')

await scheduleEvery({
  schedulerId: 'cleanup-expired-sessions',
  queue: 'cleanup',
  jobName: 'sessions.cleanup',
  every: 5 * 60 * 1000,
  data: { source: 'scheduler' },
})
```

## Cron

```js
await scheduleCron({
  schedulerId: 'daily-report',
  queue: 'platform',
  jobName: 'reports.daily',
  cron: '0 2 * * *',
})
```

## One-time delayed job

```js
await scheduleOnce({
  schedulerId: 'reminder-123',
  queue: 'platform',
  jobName: 'reminders.send',
  delay: 30 * 60 * 1000,
  data: { reminderId: '123' },
})
```

## Remove and inspect schedules

```js
await removeSchedule({ schedulerId: 'daily-report', queue: 'platform' })
const schedules = await listSchedules({ queue: 'platform' })
```

The scheduler is intentionally not tied to a database model. BullMQ stores scheduler state in Redis, and applications can define their own persistence when a business-level schedule needs metadata, ownership, or auditing.

The scheduler does not execute application logic itself. Workers still need to be registered for the queue/job names being scheduled.

## Appointment scheduling is separate

Do not move `features/appointments/appointment.slot.service.js` into this generic scheduler merely because both concepts use time. Appointment slots are business records with capacity, booking, and lifecycle semantics. The generic scheduler creates background jobs and recurring/delayed execution.
