import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/platform/authorization/access-control.service', () => ({
  can: vi.fn(),
  getAuthorizationContext: vi.fn(),
}))

vi.mock('../../../../src/platform/authorization/access-control.policy', () => ({
  assertPolicy: vi.fn(),
}))

const accessControlService = require('../../../../src/platform/authorization/access-control.service')
const authorizeResource = require('../../../../src/platform/authorization/authorizeResource')

describe('authorizeResource', () => {
  it('passes a numeric route resource ID to the loader before Prisma access', async () => {
    accessControlService.can.mockResolvedValue(true)

    const loadResource = vi.fn().mockResolvedValue({ id: 4 })
    const next = vi.fn()
    const req = {
      user: { id: 1 },
      params: { roleId: '4' },
    }

    const middleware = authorizeResource({
      resource: 'authorization',
      action: 'manage',
      loadResource,
      getResourceId: (request) => Number(request.params.roleId),
    })

    await middleware(req, {}, next)

    expect(loadResource).toHaveBeenCalledWith(4, req)
    expect(loadResource).not.toHaveBeenCalledWith('4', req)
    expect(req.authorizedResource).toEqual({ id: 4 })
    expect(next).toHaveBeenCalledWith()
  })
})
