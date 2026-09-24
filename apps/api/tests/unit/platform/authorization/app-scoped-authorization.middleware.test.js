import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/platform/authorization/authorization.service.js', () => ({
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
}))

vi.mock('../../../../src/platform/audit/audit.service.js', () => ({
  recordAuthorizationDenied: vi.fn(),
}))

const authorizationService = await import('../../../../src/platform/authorization/authorization.service.js')
const auditService = await import('../../../../src/platform/audit/audit.service.js')
const { authorize, authorizeResource } = await import('../../../../src/platform/authorization/authorization.middleware.js')

describe('app-scoped authorization middleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('denies permission checks when no application context is present', async () => {
    const next = vi.fn()
    const middleware = authorize('permits', 'read')

    await middleware({ user: { id: 42 } }, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Application context is required for authorization.',
    }))
    expect(authorizationService.can).not.toHaveBeenCalled()
  })

  it('passes the signed application context to permission checks', async () => {
    authorizationService.can.mockResolvedValue(true)
    const next = vi.fn()
    const middleware = authorize('permits', 'read')

    await middleware({ user: { id: 42 }, auth: { appId: 'app-obo' } }, {}, next)

    expect(authorizationService.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'app-obo',
      resource: 'permits',
      action: 'read',
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('uses application context for resource authorization and policy evaluation', async () => {
    authorizationService.can.mockResolvedValue(true)
    authorizationService.getAuthorizationContext.mockResolvedValue({
      userId: 42,
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: new Set(['permits:read']),
    })
    const loadResource = vi.fn().mockResolvedValue({ id: 100 })
    const policy = vi.fn().mockResolvedValue(true)
    const next = vi.fn()
    const middleware = authorizeResource({
      resource: 'permits',
      action: 'read',
      loadResource,
      policy,
    })

    await middleware({
      user: { id: 42 },
      auth: { appId: 'app-obo' },
      params: { id: '100' },
    }, {}, next)

    expect(authorizationService.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'app-obo',
      resource: 'permits',
      action: 'read',
    })
    expect(authorizationService.getAuthorizationContext).toHaveBeenCalledWith(42, 'app-obo')
    expect(policy).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: 42,
        appId: 'app-obo',
        roles: [{ id: 3, name: 'receiving_officer' }],
      }),
      resource: { id: 100 },
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('records the application when authorization is denied', async () => {
    authorizationService.can.mockResolvedValue(false)
    const next = vi.fn()
    const middleware = authorize('permits', 'read')

    await middleware({
      user: { id: 42 },
      auth: { appId: 'app-obo' },
      params: { id: '100' },
    }, {}, next)

    expect(auditService.recordAuthorizationDenied).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 42,
      appId: 'app-obo',
      resource: 'permits',
      action: 'read',
      resourceId: '100',
    }))
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'You do not have permission to perform this action.',
    }))
  })
})
