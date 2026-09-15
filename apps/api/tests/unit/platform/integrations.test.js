import { describe, expect, it, vi } from 'vitest'
import { makeIdempotencyKey, signPayload } from '../../../src/platform/integrations/webhook.service.js'

describe('platform integrations capability', () => {
  const base = { endpointId: 'endpoint-1', event: 'application.submitted', entityType: 'Application', entityId: '42', correlationId: 'corr-1' }
  it('produces deterministic webhook delivery identities', () => { expect(makeIdempotencyKey(base)).toBe(makeIdempotencyKey({ ...base })); expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, correlationId: 'corr-2' })); expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, endpointId: 'endpoint-2' })) })
  it('creates deterministic HMAC signatures for payloads', () => { const payload = { event: 'application.submitted', id: '123' }; expect(signPayload({ payload, secret: 'secret' })).toBe(signPayload({ payload, secret: 'secret' })); expect(signPayload({ payload, secret: 'secret' })).not.toBe(signPayload({ payload, secret: 'other' })) })
})
