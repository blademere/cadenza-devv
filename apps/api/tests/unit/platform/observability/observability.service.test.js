import { describe, expect, it, beforeEach } from 'vitest'

import { increment, observe, snapshot, reset } from '../../../../src/platform/observability/metrics/metrics.service.js'

describe('platform observability metrics', () => {
  beforeEach(() => reset())

  it('records counters with normalized labels', () => {
    increment('platform.job.completed', { jobType: 'email', queue: 'notifications' })
    increment('platform.job.completed', { queue: 'notifications', jobType: 'email' })

    const result = snapshot()
    expect(result.counters['platform.job.completed:{"jobType":"email","queue":"notifications"}']).toBe(2)
  })

  it('records duration aggregates', () => {
    observe('platform.workflow.transition.duration_ms', 10, { workflow: 'generic' })
    observe('platform.workflow.transition.duration_ms', 20, { workflow: 'generic' })

    const result = snapshot()
    const duration = result.durations['platform.workflow.transition.duration_ms:{"workflow":"generic"}']
    expect(duration).toEqual({ count: 2, totalMs: 30, minMs: 10, maxMs: 20 })
  })

  it('rejects invalid metric input', () => {
    expect(() => increment('', {})).toThrow()
    expect(() => observe('platform.test', -1)).toThrow()
  })
})
