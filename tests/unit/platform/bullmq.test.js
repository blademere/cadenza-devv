import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createBullMqInfrastructure } from '../../../src/infrastructure/queue/bullmq.js'

const createMocks = () => {
  const queues = []
  const workers = []
  const events = []
  const redis = { isOpen: true }

  class MockQueue {
    constructor(name, options) {
      this.name = name
      this.options = options
      this.add = vi.fn()
      this.getFailed = vi.fn()
      this.getJob = vi.fn()
      this.close = vi.fn().mockResolvedValue(undefined)
      queues.push(this)
    }
  }

  class MockWorker {
    constructor(name, processor, options) {
      this.name = name
      this.processor = processor
      this.options = options
      this.handlers = new Map()
      this.close = vi.fn().mockResolvedValue(undefined)
      this.on = vi.fn((event, handler) => {
        this.handlers.set(event, handler)
        return this
      })
      workers.push(this)
    }
  }

  class MockQueueEvents {
    constructor(name, options) {
      this.name = name
      this.options = options
      this.close = vi.fn().mockResolvedValue(undefined)
      events.push(this)
    }
  }

  const logger = {
    info: vi.fn(),
    error: vi.fn(),
  }

  return {
    queues,
    workers,
    events,
    redis,
    Queue: MockQueue,
    Worker: MockWorker,
    QueueEvents: MockQueueEvents,
    connectRedis: vi.fn(async () => redis),
    getRedisClient: vi.fn(() => redis),
    logger,
  }
}

let mocks
let queue

beforeEach(() => {
  mocks = createMocks()
  queue = createBullMqInfrastructure({
    Queue: mocks.Queue,
    Worker: mocks.Worker,
    QueueEvents: mocks.QueueEvents,
    connectRedis: mocks.connectRedis,
    getRedisClient: mocks.getRedisClient,
    logger: mocks.logger,
  })
})

describe('BullMQ infrastructure', () => {
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
