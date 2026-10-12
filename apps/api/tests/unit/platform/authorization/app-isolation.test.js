import { describe, expect, it, vi, beforeEach } from 'vitest'

const repository = {
  getUserAuthorizationContext: vi.fn(),
}

const context = {
  setApplicationContext: vi.fn(),
}

vi.mock('../../../../src/platform/authorization/authorization.repository.js', () => repository)
vi.mock('../../../../src/platform/context/index.js', () => context)

const { requireApplicationContext } = await import('../../../../src/platform/applications/application-context.middleware.js')

const requestFor = (appId) => ({
  user: { id: 42 },
  auth: { appId },
  headers: {},
  get: vi.fn(() => undefined),
})

describe('application authorization isolation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('allows a user only through an active membership for the requested CADENZA_CLIENT application', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-cadenza-client', key: 'cadenza-client', name: 'Cadenza Client', isActive: true },
      membership: { id: 'membership-cadenza' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'permits', action: 'read' }],
    })

    const req = requestFor('app-cadenza-client')
    const next = vi.fn()

    await requireApplicationContext({ appKey: 'cadenza-client' })(req, {}, next)

    expect(next).toHaveBeenCalledWith()
    expect(req.security.roles).toEqual([{ id: 3, name: 'receiving_officer' }])
    expect(req.security.permissions).toEqual([{ resource: 'permits', action: 'read' }])
  })

  it('denies CADENZA_CLIENT access when the same user is not an active member of CADENZA_CLIENT', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue(null)

    const req = requestFor('app-other')
    const next = vi.fn()

    await requireApplicationContext({ appKey: 'cadenza-client' })(req, {}, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'User does not have an active membership for this application.',
    }))
    expect(context.setApplicationContext).not.toHaveBeenCalled()
  })

  it('does not leak an CADENZA_CLIENT role into another application', async () => {
    repository.getUserAuthorizationContext.mockImplementation(async ({ appId }) => {
      if (appId === 'app-cadenza-client') {
        return {
          userId: 42,
          app: { id: 'app-cadenza-client', key: 'cadenza-client', name: 'Cadenza Client', isActive: true },
          membership: { id: 'membership-cadenza' },
          roles: [{ id: 3, name: 'receiving_officer' }],
          permissions: [{ resource: 'permits', action: 'receive' }],
        }
      }

      return {
        userId: 42,
        app: { id: 'app-other', key: 'other', name: 'Other App', isActive: true },
        membership: { id: 'membership-other' },
        roles: [{ id: 9, name: 'administrator' }],
        permissions: [{ resource: 'admin', action: 'manage' }],
      }
    })

    const cadenzaRequest = requestFor('app-cadenza-client')
    const cadenzaNext = vi.fn()
    await requireApplicationContext()(cadenzaRequest, {}, cadenzaNext)

    const otherRequest = requestFor('app-other')
    const otherNext = vi.fn()
    await requireApplicationContext()(otherRequest, {}, otherNext)

    expect(cadenzaRequest.security.roles).toEqual([{ id: 3, name: 'receiving_officer' }])
    expect(otherRequest.security.roles).toEqual([{ id: 9, name: 'administrator' }])
    expect(otherRequest.security.roles).not.toContainEqual({ id: 3, name: 'receiving_officer' })
    expect(otherRequest.security.permissions).not.toContainEqual({ resource: 'permits', action: 'receive' })
  })

  it('preserves multiple roles within one application without granting roles from another application', async () => {
    repository.getUserAuthorizationContext.mockResolvedValue({
      userId: 42,
      app: { id: 'app-cadenza-client', key: 'cadenza-client', name: 'Cadenza Client', isActive: true },
      membership: { id: 'membership-cadenza' },
      roles: [
        { id: 3, name: 'receiving_officer' },
        { id: 4, name: 'reviewer' },
      ],
      permissions: [
        { resource: 'permits', action: 'receive' },
        { resource: 'professionals', action: 'review' },
      ],
    })

    const req = requestFor('app-cadenza-client')
    const next = vi.fn()

    await requireApplicationContext()(req, {}, next)

    expect(req.security.roles).toHaveLength(2)
    expect(req.security.roles.map(({ name }) => name)).toEqual(['receiving_officer', 'reviewer'])
  })
})
