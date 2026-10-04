import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/platform/authorization/authorization.service.js', () => ({
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
}))
vi.mock('../../../../src/platform/authorization/authorization.policy.js', () => ({
  assertPolicy: vi.fn(),
}))
vi.mock('../../../../src/platform/audit/audit.service.js', () => ({
  recordAuthorizationDenied: vi.fn(),
}))

const authorizationService = await import('../../../../src/platform/authorization/authorization.service.js')
const { authorizeResource } = await import('../../../../src/platform/authorization/authorization.middleware.js')

afterEach(() => vi.clearAllMocks())

describe('application-scoped authorization', () => {
  it('passes the request application to the permission check and resource loader', async () => {
    authorizationService.can.mockResolvedValue(true)
    const loadResource = vi.fn().mockResolvedValue({ id: 'case-1', appId: 'obo-app' })
    const next = vi.fn()
    const req = {
      user: { id: 7 },
      auth: { appId: 'obo-app' },
      appContext: { id: 'obo-app' },
      params: { id: 'case-1' },
    }

    await authorizeResource({ resource: 'cases', action: 'read', loadResource })(req, {}, next)

    expect(authorizationService.can).toHaveBeenCalledWith({ userId: 7, appId: 'obo-app', resource: 'cases', action: 'read' })
    expect(loadResource).toHaveBeenCalledWith('case-1', req)
    expect(req.authorizedResource).toEqual({ id: 'case-1', appId: 'obo-app' })
    expect(next).toHaveBeenCalledWith()
  })

  it('does not authorize a resource owned by another application', async () => {
    authorizationService.can.mockResolvedValue(true)
    const loadResource = vi.fn().mockResolvedValue({ id: 'case-2', appId: 'admin-app' })
    const next = vi.fn()
    const req = {
      user: { id: 7 },
      auth: { appId: 'obo-app' },
      appContext: { id: 'obo-app' },
      params: { id: 'case-2' },
    }

    await authorizeResource({ resource: 'cases', action: 'read', loadResource })(req, {}, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toMatchObject({ message: 'Resource not found.' })
    expect(req.authorizedResource).toBeUndefined()
  })

  it('requires application context before permission evaluation', async () => {
    const loadResource = vi.fn()
    const next = vi.fn()
    const req = { user: { id: 7 }, params: { id: 'case-1' } }

    await authorizeResource({ resource: 'cases', action: 'read', loadResource })(req, {}, next)

    expect(authorizationService.can).not.toHaveBeenCalled()
    expect(loadResource).not.toHaveBeenCalled()
    expect(next.mock.calls[0][0]).toMatchObject({ message: 'Application context is required for authorization.' })
  })
})
