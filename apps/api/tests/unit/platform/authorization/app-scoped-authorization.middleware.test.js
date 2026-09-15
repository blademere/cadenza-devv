import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../../src/platform/authorization/access-control.service.js', () => ({
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
}))

vi.mock('../../../../src/platform/audit/audit.service.js', () => ({
  recordAuthorizationDenied: vi.fn(),
}))

const accessControlService = await import('../../../../src/platform/authorization/access-control.service.js')
const auditService = await import('../../../../src/platform/audit/audit.service.js')
const authorize = (await import('../../../../src/platform/authorization/authorize.js')).default
const authorizeResource = (await import('../../../../src/platform/authorization/authorization-resource.middleware.js')).default

describe('app-scoped authorization middleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('denies permission checks when no application context is present', async () => {
    const next = vi.fn()
    const middleware = authorize('permits', 'read')

    await middleware({ user: { id: 42 } }, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Application context is required for authorization.',
    }))
    expect(accessControlService.can).not.toHaveBeenCalled()
  })

  it('passes the signed application context to permission checks', async () => {
    accessControlService.can.mockResolvedValue(true)
    const next = vi.fn()
    const middleware = authorize('permits', 'read')

    await middleware({ user: { id: 42 }, auth: { appId: 'app-obo' } }, {}, next)

    expect(accessControlService.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'app-obo',
      resource: 'permits',
      action: 'read',
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('uses application context for resource authorization and policy evaluation', async () => {
    accessControlService.can.mockResolvedValue(true)
    accessControlService.getAuthorizationContext.mockResolvedValue({
      userId: 42,
      role: null,
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

    expect(accessControlService.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'app-obo',
      resource: 'permits',
      action: 'read',
    })
    expect(accessControlService.getAuthorizationContext).toHaveBeenCalledWith(42, 'app-obo')
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
    accessControlService.can.mockResolvedValue(false)
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
