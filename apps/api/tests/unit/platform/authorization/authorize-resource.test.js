import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/platform/authorization/access-control.service.js', () => ({ can: vi.fn(), getAuthorizationContext: vi.fn() }))
vi.mock('../../../../src/platform/authorization/access-control.policy.js', () => ({ assertPolicy: vi.fn() }))

const accessControlService = await import('../../../../src/platform/authorization/access-control.service.js')
const { default: authorizeResource } = await import('../../../../src/platform/authorization/authorization-resource.middleware.js')

describe('authorizeResource', () => {
  it('passes a numeric route resource ID to the loader before Prisma access', async () => {
    accessControlService.can.mockResolvedValue(true)
    const loadResource = vi.fn().mockResolvedValue({ id: 4 })
    const next = vi.fn()
    const req = { user: { id: 1 }, params: { roleId: '4' } }
    const middleware = authorizeResource({ resource: 'authorization', action: 'manage', loadResource, getResourceId: (request) => Number(request.params.roleId) })
    await middleware(req, {}, next)
    expect(loadResource).toHaveBeenCalledWith(4, req)
    expect(loadResource).not.toHaveBeenCalledWith('4', req)
    expect(req.authorizedResource).toEqual({ id: 4 })
    expect(next).toHaveBeenCalledWith()
  })
})
