import { describe, expect, it, vi } from 'vitest'

const createQueue = () => ({
  upsertJobScheduler: vi.fn(async (id, schedule, template) => ({ id, schedule, template })),
  removeJobScheduler: vi.fn(async (id) => id),
  getJobSchedulers: vi.fn(async (start, end) => [{ id: 'example', start, end }]),
})

describe('scheduler service', () => {
  it('schedules recurring jobs by interval', async () => {
    const queue = createQueue()
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: { getQueue: vi.fn(async () => queue) },
    })

    const result = await scheduler.scheduleEvery({
      schedulerId: 'cleanup',
      queue: 'cleanup',
      jobName: 'cleanup.run',
      every: 300000,
      data: { source: 'test' },
    })

    expect(result.schedule).toEqual({ every: 300000 })
    expect(result.template.name).toBe('cleanup.run')
    expect(result.template.data).toEqual({ source: 'test' })
  })

  it('schedules recurring jobs from cron expressions', async () => {
    const queue = createQueue()
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: { getQueue: vi.fn(async () => queue) },
    })

    const result = await scheduler.scheduleCron({
      schedulerId: 'daily-report',
      jobName: 'reports.daily',
      cron: '0 2 * * *',
    })

    expect(result.schedule).toEqual({ pattern: '0 2 * * *' })
  })

  it('schedules one-time delayed jobs through the queue provider', async () => {
    const enqueueJob = vi.fn(async (...args) => args)
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: {
        getQueue: vi.fn(),
        enqueueJob,
      },
    })

    await scheduler.scheduleOnce({
      schedulerId: 'reminder-1',
      queue: 'platform',
      jobName: 'reminder.send',
      delay: 60000,
      data: { id: 1 },
    })

    expect(enqueueJob).toHaveBeenCalledWith(
      'platform',
      'reminder.send',
      { id: 1 },
      expect.objectContaining({ jobId: 'reminder-1', delay: 60000 }),
    )
  })

  it('rejects invalid intervals', async () => {
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: { getQueue: vi.fn() },
    })

    await expect(
      scheduler.scheduleEvery({ schedulerId: 'bad', jobName: 'bad.job', every: 500 }),
    ).rejects.toThrow(/every must be an integer/)
  })

  it('rejects invalid cron expressions', async () => {
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: { getQueue: vi.fn() },
    })

    await expect(
      scheduler.scheduleCron({ schedulerId: 'bad', jobName: 'bad.job', cron: '* *' }),
    ).rejects.toThrow(/cron must contain at least 5 fields/)
  })

  it('removes an existing schedule', async () => {
    const queue = createQueue()
    const scheduler = require('../../../../../src/platform/scheduler/scheduler.service').createSchedulerService({
      queueProvider: { getQueue: vi.fn(async () => queue) },
    })

    await scheduler.removeSchedule({ schedulerId: 'cleanup', queue: 'cleanup' })
    expect(queue.removeJobScheduler).toHaveBeenCalledWith('cleanup')
  })
})
