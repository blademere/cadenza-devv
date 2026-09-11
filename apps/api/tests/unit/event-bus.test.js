import { describe, expect, it } from 'vitest'
const { buildEnvelope, resolveCorrelationId } = require('../../src/platform/event-bus/event-bus')
const { runWithContext } = require('../../src/platform/context/context.service')
const { MAX_EVENT_DEPTH } = require('../../src/platform/event-bus/event-outbox.service')

describe('event bus envelope', () => {
  it('normalizes entity ids and carries correlation metadata', () => {
    const envelope = buildEnvelope({
      event: 'application.submitted',
      entityType: 'PermitApplication',
      entityId: 42,
      actorId: 7,
      context: { source: 'test' },
      correlationId: 'corr-1',
      causationId: 'cause-1',
      depth: 2,
    })

    expect(envelope).toMatchObject({
      event: 'application.submitted',
      entityType: 'PermitApplication',
      entityId: '42',
      actorId: 7,
      correlationId: 'corr-1',
      causationId: 'cause-1',
      depth: 2,
      context: { source: 'test' },
    })
    expect(envelope.occurredAt).toEqual(expect.any(String))
  })

  it('uses the active execution context correlation id when one is not supplied', async () => {
    await runWithContext({ requestId: 'req-1', correlationId: 'corr-1' }, async () => {
      expect(resolveCorrelationId()).toBe('corr-1')

      const envelope = buildEnvelope({ event: 'application.submitted' })
      expect(envelope.correlationId).toBe('corr-1')
    })
  })

  it('rejects events beyond the configured maximum depth', () => {
    expect(() => buildEnvelope({ event: 'loop', depth: MAX_EVENT_DEPTH + 1 })).toThrow(/Maximum event depth/)
  })
})
