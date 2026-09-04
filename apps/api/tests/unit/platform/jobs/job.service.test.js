import { describe, expect, it, vi } from 'vitest'
import { createJobService } from '../../../../src/platform/jobs/job.service.js'

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

  it('rejects unknown queues', async () => {
    const { enqueueJob } = createJobService({ enqueue: vi.fn() })

    await expect(enqueueJob({
      queue: 'missing',
      name: 'test',
      data: {},
    })).rejects.toThrow('Unknown job queue: missing')
  })
})
