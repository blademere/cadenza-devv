# Generic Scheduler

The template provides a thin scheduling abstraction over BullMQ. Scheduling only creates or removes jobs; application code remains responsible for registering workers that handle the job names.

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
