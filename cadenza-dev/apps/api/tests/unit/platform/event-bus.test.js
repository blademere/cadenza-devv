import { describe, expect, it } from 'vitest'
import { buildEnvelope, resolveCorrelationId } from '../../../src/platform/event-bus/event-bus.js'
import { runWithContext } from '../../../src/platform/context/context.service.js'
import { MAX_EVENT_DEPTH } from '../../../src/platform/event-bus/event-outbox.service.js'

describe('event bus capability', () => {
  it('normalizes entity ids and carries correlation metadata', () => {
    const envelope = buildEnvelope({ event: 'application.submitted', entityType: 'PermitApplication', entityId: 42, actorId: 7, context: { source: 'test' }, correlationId: 'corr-1', causationId: 'cause-1', depth: 2 })
    expect(envelope).toMatchObject({ event: 'application.submitted', entityType: 'PermitApplication', entityId: '42', actorId: 7, correlationId: 'corr-1', causationId: 'cause-1', depth: 2, context: { source: 'test' } })
    expect(envelope.occurredAt).toEqual(expect.any(String))
  })
  it('protects reserved platform context from caller overrides', async () => {
    await runWithContext({ requestId: 'req-1', correlationId: 'corr-1', actorId: 42, actorType: 'user', organizationId: 7, metadata: { source: 'request' } }, async () => {
      const envelope = buildEnvelope({ event: 'application.submitted', context: { source: 'event', _platformContext: { requestId: 'spoofed', correlationId: 'spoofed', actorId: 999 } } })
      expect(envelope.context.source).toBe('event')
      expect(envelope.context._platformContext).toEqual({ requestId: 'req-1', correlationId: 'corr-1', actorId: 42, actorType: 'user', organizationId: 7 })
    })
  })
  it('uses the active execution context correlation id when one is not supplied', async () => { await runWithContext({ requestId: 'req-1', correlationId: 'corr-1' }, async () => { expect(resolveCorrelationId()).toBe('corr-1'); expect(buildEnvelope({ event: 'application.submitted' }).correlationId).toBe('corr-1') }) })
  it('rejects events beyond the configured maximum depth', () => expect(() => buildEnvelope({ event: 'loop', depth: MAX_EVENT_DEPTH + 1 })).toThrow(/Maximum event depth/))
})
