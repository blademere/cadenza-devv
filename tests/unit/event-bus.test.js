import { describe, expect, it } from 'vitest'
const { buildEnvelope } = require('../../src/platform/event-bus/event-bus')
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

  it('rejects events beyond the configured maximum depth', () => {
    expect(() => buildEnvelope({ event: 'loop', depth: MAX_EVENT_DEPTH + 1 })).toThrow(/Maximum event depth/)
  })
})
