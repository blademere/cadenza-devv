import { describe, expect, it, vi } from 'vitest'
import { executeWithJobContext } from '../../../../src/platform/jobs/job.worker.js'
import { getContext } from '../../../../src/platform/context/context.service.js'

describe('job worker context propagation', () => {
  it('restores the platform context while processing a job', async () => {
    const processor = vi.fn(async () => getContext())

    const result = await executeWithJobContext({
      data: {
        _platformContext: {
          requestId: 'req-1',
          correlationId: 'corr-1',
          actorId: 42,
          actorType: 'user',
          organizationId: 7,
        },
      },
    }, processor)

    expect(result).toMatchObject({
      requestId: 'req-1',
      correlationId: 'corr-1',
      actorId: 42,
      actorType: 'user',
      organizationId: 7,
    })
    expect(processor).toHaveBeenCalledOnce()
  })

  it('does not create context when a job has no platform context', async () => {
    const processor = vi.fn(async () => getContext())

    const result = await executeWithJobContext({ data: {} }, processor)

    expect(result).toBeNull()
  })
})
