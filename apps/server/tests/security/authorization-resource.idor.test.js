import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
  assertPolicy: vi.fn(),
}))

vi.mock('../../src/platform/authorization/access-control.service', () => ({
  can: mocks.can,
  getAuthorizationContext: mocks.getAuthorizationContext,
}))

vi.mock('../../src/platform/authorization/access-control.policy', () => ({
  assertPolicy: mocks.assertPolicy,
}))

const authorizeResource = require('../../src/platform/authorization/authorizeResource')

const runMiddleware = async (options, req = { user: { id: 1 }, params: { id: '42' } }) => {
  const middleware = authorizeResource(options)
  const next = vi.fn()
  await middleware(req, {}, next)
  return { req, next }
}

describe('resource authorization / IDOR security boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.can.mockResolvedValue(true)
    mocks.getAuthorizationContext.mockResolvedValue({
      role: { id: 1, name: 'client' },
    })
    mocks.assertPolicy.mockResolvedValue(undefined)
  })

  it('requires the capability before loading the requested resource', async () => {
    mocks.can.mockResolvedValue(false)
    const loadResource = vi.fn()

    const { next } = await runMiddleware({
      resource: 'applications',
      action: 'read',
      loadResource,
    })

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 })
    expect(loadResource).not.toHaveBeenCalled()
  })

  it('returns not-found when an authenticated user targets a resource that does not exist', async () => {
    const loadResource = vi.fn().mockResolvedValue(null)

    const { next } = await runMiddleware({
      resource: 'applications',
      action: 'read',
      loadResource,
    })

    expect(loadResource).toHaveBeenCalledWith('42', expect.any(Object))
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 404 })
  })

  it('enforces ownership after capability authorization, preventing cross-user IDOR', async () => {
    const resource = { id: 42, clientId: 99 }
    const loadResource = vi.fn().mockResolvedValue(resource)
    mocks.assertPolicy.mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }))

    const { next } = await runMiddleware({
      resource: 'applications',
      action: 'read',
      loadResource,
      policy: ({ user, resource: loaded }) => Number(user.id) === Number(loaded.clientId),
      getOwnerId: (loaded) => loaded.clientId,
    })

    expect(mocks.can).toHaveBeenCalledWith({
      userId: 1,
      resource: 'applications',
      action: 'read',
    })
    expect(mocks.assertPolicy).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ id: 1, ownerId: 99 }),
      resource,
    }))
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 })
    expect(next.mock.calls[0][0].message).toBe('forbidden')
  })

  it('attaches the authorized resource only after policy succeeds', async () => {
    const resource = { id: 42, clientId: 1 }
    const loadResource = vi.fn().mockResolvedValue(resource)

    const { req, next } = await runMiddleware({
      resource: 'applications',
      action: 'read',
      loadResource,
      policy: ({ user, resource: loaded }) => Number(user.id) === Number(loaded.clientId),
      getOwnerId: (loaded) => loaded.clientId,
    })

    expect(mocks.assertPolicy).toHaveBeenCalledTimes(1)
    expect(req.authorizedResource).toBe(resource)
    expect(next).toHaveBeenCalledWith()
  })

  it('does not permit missing authentication context to reach the resource loader', async () => {
    const loadResource = vi.fn()
    const { next } = await runMiddleware(
      {
        resource: 'applications',
        action: 'read',
        loadResource,
      },
      { params: { id: '42' } },
    )

    expect(loadResource).not.toHaveBeenCalled()
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 })
  })
})
