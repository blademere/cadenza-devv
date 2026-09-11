import { describe, expect, it } from 'vitest'
import {
  getContext,
  requireContext,
  runWithContext,
  setActorContext,
  withContext,
} from '../../../../src/platform/context/context.service.js'

describe('platform execution context', () => {
  it('returns null outside an execution context', () => {
    expect(getContext()).toBeNull()
  })

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

  it('throws when a required context is unavailable', () => {
    expect(() => requireContext()).toThrow(/execution context is not available/)
  })
})
