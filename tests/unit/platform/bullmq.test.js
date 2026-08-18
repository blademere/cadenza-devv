import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'

const mocks = vi.hoisted(() => ({
  queues: [],
  workers: [],
  events: [],
  redis: { isOpen: true },
}))

vi.mock('../../../src/infrastructure/cache/redis.js', () => ({
  connectRedis: vi.fn(async () => mocks.redis),
  getRedisClient: vi.fn(() => mocks.redis),
}))

vi.mock('../../../src/config/index.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('bullmq', () => ({
  Queue: class MockQueue {
    constructor(name, options) {
      this.name = name
      this.options = options
      this.add = vi.fn()
      this.getFailed = vi.fn()
      this.getJob = vi.fn()
      this.close = vi.fn().mockResolvedValue(undefined)
      mocks.queues.push(this)
    }
  },
  Worker: class MockWorker {
    constructor(name, processor, options) {
      this.name = name
      this.processor = processor
      this.options = options
      this.handlers = new Map()
      this.close = vi.fn().mockResolvedValue(undefined)
      this.on = vi.fn((event, handler) => this.handlers.set(event, handler))
      mocks.workers.push(this)
    }
  },
  QueueEvents: class MockQueueEvents {
    constructor(name, options) {
      this.name = name
      this.options = options
      this.close = vi.fn().mockResolvedValue(undefined)
      mocks.events.push(this)
    }
  },
}))

let queue

beforeAll(async () => {
  queue = await import('../../../src/infrastructure/queue/bullmq.js')
})

describe('BullMQ infrastructure', () => {
  beforeEach(async () => {
    await queue.closeQueues()
    mocks.queues.length = 0
    mocks.workers.length = 0
    mocks.events.length = 0
  })

  it('creates a queue with production retry and retention defaults', async () => {
    const instance = await queue.getQueue('test-events')

    expect(instance.options.defaultJobOptions).toEqual({
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 86400, count: 1000 },
      removeOnFail: false,
    })
  })

  it('enqueues a named job with caller options', async () => {
    const instance = await queue.getQueue('test-events')
    instance.add.mockResolvedValue({ id: 'job-1' })

    await expect(
      queue.enqueueJob('test-events', 'platform-event', { event: 'created' }, {
        jobId: 'event-1',
        attempts: 3,
      }),
    ).resolves.toEqual({ id: 'job-1' })

    expect(instance.add).toHaveBeenCalledWith(
      'platform-event',
      { event: 'created' },
      { jobId: 'event-1', attempts: 3 },
    )
  })

  it('registers workers with bounded concurrency and closes them gracefully', async () => {
    const processor = vi.fn()
    await queue.registerWorker('test-events', processor, { concurrency: 4 })

    expect(mocks.workers[0].options.concurrency).toBe(4)
    expect(mocks.workers[0].handlers.has('failed')).toBe(true)

    await queue.closeQueues()
    expect(mocks.workers[0].close).toHaveBeenCalledOnce()
  })
})
