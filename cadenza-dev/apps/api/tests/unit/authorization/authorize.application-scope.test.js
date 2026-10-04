import { describe, expect, it, vi, beforeEach } from 'vitest'

const authorization = { can: vi.fn() }
const audit = { recordAuthorizationDenied: vi.fn() }
const context = { getContext: vi.fn(() => ({ requestId: 'request-1', correlationId: 'correlation-1' })) }

vi.mock('../../../src/platform/authorization/authorization.service.js', () => authorization)
vi.mock('../../../src/platform/audit/audit.service.js', () => audit)
vi.mock('../../../src/platform/context/context.service.js', () => context)

const { authorize } = await import('../../../src/platform/authorization/authorization.middleware.js')

const createRequest = ({ appId = 'obo-app', userId = 42 } = {}) => ({
  user: { id: userId },
  auth: { appId },
  params: { id: '123' },
  ip: '127.0.0.1',
  get: vi.fn((name) => name === 'user-agent' ? 'vitest' : undefined),
})

describe('application-scoped authorization middleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes the resolved application id to the authorization service', async () => {
    authorization.can.mockResolvedValue(true)
    const req = createRequest({ appId: 'obo-app' })
    const next = vi.fn()

    await authorize('obo_applications', 'read')(req, {}, next)

    expect(authorization.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'obo-app',
      resource: 'obo_applications',
      action: 'read',
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('does not authorize a request without application context', async () => {
    const req = createRequest({ appId: null })
    req.auth = {}
    req.appContext = null
    const next = vi.fn()

    await authorize('obo_applications', 'read')(req, {}, next)

    expect(authorization.can).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Application context is required for authorization.',
    }))
  })

  it('denies a permission that is absent from the selected application', async () => {
    authorization.can.mockResolvedValue(false)
    const req = createRequest({ appId: 'admin-app' })
    const next = vi.fn()

    await authorize('obo_applications', 'read')(req, {}, next)

    expect(authorization.can).toHaveBeenCalledWith({
      userId: 42,
      appId: 'admin-app',
      resource: 'obo_applications',
      action: 'read',
    })
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'You do not have permission to perform this action.',
    }))
    expect(audit.recordAuthorizationDenied).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 42,
      appId: 'admin-app',
      resource: 'obo_applications',
      action: 'read',
      resourceId: '123',
    }))
  })

  it('allows the same user to be evaluated independently for another application', async () => {
    authorization.can.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const oboRequest = createRequest({ appId: 'obo-app' })
    const adminRequest = createRequest({ appId: 'admin-app' })
    const oboNext = vi.fn()
    const adminNext = vi.fn()

    await authorize('obo_applications', 'read')(oboRequest, {}, oboNext)
    await authorize('obo_applications', 'read')(adminRequest, {}, adminNext)

    expect(authorization.can).toHaveBeenNthCalledWith(1, {
      userId: 42,
      appId: 'obo-app',
      resource: 'obo_applications',
      action: 'read',
    })
    expect(authorization.can).toHaveBeenNthCalledWith(2, {
      userId: 42,
      appId: 'admin-app',
      resource: 'obo_applications',
      action: 'read',
    })
    expect(oboNext).toHaveBeenCalledWith()
    expect(adminNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })
})
