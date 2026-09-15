import { describe, expect, it, vi, beforeEach } from 'vitest'

const repository = {
  getUserAuthorizationContext: vi.fn(),
}

const context = {
  setApplicationContext: vi.fn(),
}

vi.mock('../../../../src/platform/authorization/authorization-context.repository.js', () => repository)
vi.mock('../../../../src/platform/context/index.js', () => context)

const { requireApplicationContext, readApplicationId } = await import('../../../../src/platform/applications/application-context.middleware.js')

const createRequest = ({ appId, tokenAppId = null } = {}) => ({
  user: { id: 42 },
  auth: { appId: tokenAppId },
  headers: appId ? { 'x-app-id': appId } : {},
  get: vi.fn((name) => name.toLowerCase() === 'x-app-id' ? appId : undefined),
})

describe('application context middleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects requests without an application context', async () => {
    const req = createRequest()
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Application context is required.',
    }))
    expect(repository.getUserAuthorizationContext).not.toHaveBeenCalled()
  })

  it('uses the signed token app id and validates membership without requiring a header', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'permits', action: 'read' }],
    })

    const req = createRequest({ tokenAppId: 'app-1' })
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(repository.getUserAuthorizationContext).toHaveBeenCalledWith({ userId: 42, appId: 'app-1' })
    expect(req.security.app.id).toBe('app-1')
    expect(context.setApplicationContext).toHaveBeenCalledWith({ appId: 'app-1', appKey: 'obo' })
    expect(next).toHaveBeenCalledWith()
  })

  it('requires the requested application key when configured', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'permits', action: 'read' }],
    })

    const req = createRequest({ tokenAppId: 'app-1' })
    const next = vi.fn()

    await requireApplicationContext({ appKey: 'obo' })(req, {}, next)

    expect(req.security.app.key).toBe('obo')
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects a request authenticated for another application', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-2', key: 'other', name: 'Other App', isActive: true },
      membership: { id: 'membership-2' },
      roles: [{ id: 9, name: 'administrator' }],
      permissions: [{ resource: 'admin', action: 'read' }],
    })

    const req = createRequest({ tokenAppId: 'app-2' })
    const next = vi.fn()

    await requireApplicationContext({ appKey: 'obo' })(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: "Application context 'obo' is required.",
    }))
    expect(context.setApplicationContext).not.toHaveBeenCalled()
  })

  it('rejects a conflicting application header when the token is app-scoped', async () => {
    const req = createRequest({ tokenAppId: 'app-1', appId: 'app-2' })
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(repository.getUserAuthorizationContext).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Application context does not match the access token.',
    }))
  })

  it('validates membership before establishing application security context', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'permits', action: 'read' }],
    })

    const req = createRequest({ appId: 'app-1' })
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(repository.getUserAuthorizationContext).toHaveBeenCalledWith({ userId: 42, appId: 'app-1' })
    expect(req.appContext).toEqual({
      id: 'app-1',
      key: 'obo',
      name: 'One-Stop Business Office',
      isActive: true,
    })
    expect(req.appMembership).toEqual({ id: 'membership-1' })
    expect(req.security).toEqual({
      user: req.user,
      app: req.appContext,
      membership: req.appMembership,
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'permits', action: 'read' }],
    })
    expect(context.setApplicationContext).toHaveBeenCalledWith({ appId: 'app-1', appKey: 'obo' })
    expect(next).toHaveBeenCalledWith()
  })

  it('denies users without an active membership', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue(null)

    const req = createRequest({ tokenAppId: 'app-1' })
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'User does not have an active membership for this application.',
    }))
    expect(context.setApplicationContext).not.toHaveBeenCalled()
  })

  it('reads a normalized application id from the request header', () => {
    const req = createRequest({ appId: '  app-1  ' })
    expect(readApplicationId(req)).toBe('app-1')
  })
})
