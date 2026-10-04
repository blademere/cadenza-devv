import { describe, expect, it, vi } from 'vitest'
import { contextMiddleware } from '../../../src/platform/context/context.middleware.js'
import {
  getContext,
  requireContext,
  runWithContext,
  setActorContext,
  withContext,
} from '../../../src/platform/context/context.service.js'

describe('platform execution context', () => {
  const makeRequest = ({ requestId, correlationId, user } = {}) => ({
    requestId,
    user,
    get: vi.fn((name) => {
      if (name.toLowerCase() === 'x-request-id') return requestId
      if (name.toLowerCase() === 'x-correlation-id') return correlationId
      return undefined
    }),
  })
  const makeResponse = () => ({ set: vi.fn() })

  it('returns null outside an execution context', () =>
    expect(getContext()).toBeNull())
  it('normalizes the generic context shape', async () => {
    await runWithContext(
      {
        requestId: 'req-1',
        correlationId: 'corr-1',
        actorId: 42,
        actorType: 'user',
        organizationId: 7,
        metadata: { source: 'test' },
      },
      async () => {
        expect(requireContext()).toEqual({
          requestId: 'req-1',
          correlationId: 'corr-1',
          actorId: 42,
          actorType: 'user',
          organizationId: 7,
          appId: null,
          appKey: null,
          metadata: { source: 'test' },
        })
      }
    )
  })
  it('propagates actor context after authentication', async () => {
    await runWithContext(
      { requestId: 'req-1', correlationId: 'corr-1' },
      async () => {
        setActorContext({ actorId: 42, actorType: 'user', organizationId: 7 })
        expect(getContext()).toMatchObject({
          actorId: 42,
          actorType: 'user',
          organizationId: 7,
        })
      }
    )
  })
  it('creates an isolated derived context with merged metadata', async () => {
    await runWithContext(
      {
        requestId: 'req-1',
        correlationId: 'corr-1',
        metadata: { source: 'http' },
      },
      async () => {
        await withContext(
          { correlationId: 'corr-2', metadata: { operation: 'test' } },
          async () => {
            expect(getContext()).toMatchObject({
              requestId: 'req-1',
              correlationId: 'corr-2',
              metadata: { source: 'http', operation: 'test' },
            })
          }
        )
        expect(getContext()).toMatchObject({
          requestId: 'req-1',
          correlationId: 'corr-1',
          metadata: { source: 'http' },
        })
      }
    )
  })
  it('throws when a required context is unavailable', () =>
    expect(() => requireContext()).toThrow(
      /execution context is not available/
    ))

  it('preserves the request id and accepts a correlation id', () => {
    const req = makeRequest({
      requestId: 'req-1',
      correlationId: 'corr-1',
      user: { id: 42, type: 'user', organizationId: 7 },
    })
    const res = makeResponse()
    const next = vi.fn()
    contextMiddleware(req, res, next)
    expect(req.requestId).toBe('req-1')
    expect(req.correlationId).toBe('corr-1')
    expect(res.set).toHaveBeenCalledWith('x-request-id', 'req-1')
    expect(res.set).toHaveBeenCalledWith('x-correlation-id', 'corr-1')
    expect(next).toHaveBeenCalledOnce()
  })
  it('generates a request and correlation id when they are absent', () => {
    const req = makeRequest()
    const res = makeResponse()
    const next = vi.fn()
    contextMiddleware(req, res, next)
    expect(req.requestId).toEqual(expect.any(String))
    expect(req.correlationId).toBe(req.requestId)
    expect(req.requestId.length).toBeGreaterThan(0)
    expect(next).toHaveBeenCalledOnce()
  })
  it('rejects oversized incoming ids and does not use them as context ids', () => {
    const oversized = 'x'.repeat(129)
    const req = makeRequest({ requestId: oversized, correlationId: oversized })
    const res = makeResponse()
    const next = vi.fn()
    contextMiddleware(req, res, next)
    expect(req.requestId).not.toBe(oversized)
    expect(req.correlationId).not.toBe(oversized)
    expect(next).toHaveBeenCalledOnce()
  })
  it('initializes actor context from authenticated request data', () => {
    const req = makeRequest({
      requestId: 'req-1',
      user: { id: 42, actorType: 'staff', organization: { id: 7 } },
    })
    const res = makeResponse()
    const next = vi.fn(() => {
      expect(getContext()).toMatchObject({
        requestId: 'req-1',
        correlationId: 'req-1',
        actorId: 42,
        actorType: 'staff',
        organizationId: 7,
      })
    })
    contextMiddleware(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
