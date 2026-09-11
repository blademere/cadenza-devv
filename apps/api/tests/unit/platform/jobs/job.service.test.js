import { describe, expect, it, vi } from 'vitest'
import { createJobService } from '../../../../src/platform/jobs/job.service.js'
import { runWithContext } from '../../../../src/platform/context/context.service.js'

describe('job service', () => {
  it('enqueues a job with stable defaults', async () => {
    const enqueueBullMqJob = vi.fn().mockResolvedValue({ id: 'job-1' })
    const { enqueueJob } = createJobService({ enqueue: enqueueBullMqJob })

    await enqueueJob({
      queue: 'notifications',
      name: 'notification.delivery',
      data: { deliveryId: 'delivery-1' },
      jobId: 'notification-delivery:delivery-1',
    })

    expect(enqueueBullMqJob).toHaveBeenCalledWith(
      'notifications',
      'notification.delivery',
      { deliveryId: 'delivery-1' },
      expect.objectContaining({
        jobId: 'notification-delivery-delivery-1',
        attempts: 5,
        delay: 0,
        backoff: { type: 'exponential', delay: 1000 },
      }),
    )
  })

  it('propagates the active platform context into job data', async () => {
    const enqueueBullMqJob = vi.fn().mockResolvedValue({ id: 'job-1' })
    const { enqueueJob } = createJobService({ enqueue: enqueueBullMqJob })

    await runWithContext({
      requestId: 'req-1',
      correlationId: 'corr-1',
      actorId: 42,
      actorType: 'user',
      organizationId: 7,
    }, async () => {
      await enqueueJob({
        queue: 'notifications',
        name: 'notification.delivery',
        data: { deliveryId: 'delivery-1' },
      })
    })

    expect(enqueueBullMqJob.mock.calls[0][2]).toEqual({
      deliveryId: 'delivery-1',
      _platformContext: {
        requestId: 'req-1',
        correlationId: 'corr-1',
        actorId: 42,
        actorType: 'user',
        organizationId: 7,
      },
    })
  })

  it('rejects unknown queues', async () => {
    const { enqueueJob } = createJobService({ enqueue: vi.fn() })

    await expect(enqueueJob({
      queue: 'missing',
      name: 'test',
      data: {},
    })).rejects.toThrow('Unknown job queue: missing')
  })
})
