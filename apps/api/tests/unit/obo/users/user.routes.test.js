import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../../src/common/middleware/index.js', () => ({
  asyncHandler: (handler) => handler,
  validate: () => (_req, _res, next) => next(),
  idempotency: () => (_req, _res, next) => next(),
}))

vi.mock('../../../../src/apps/obo/authorization/authorization.service.js', () => ({
  authorizeOBO: vi.fn(() => 'action-authorization'),
  authorizeOBOResource: vi.fn(() => 'resource-authorization'),
}))

vi.mock('../../../../src/platform/applications/application.service.js', () => ({
  getUserMembership: vi.fn(),
}))

vi.mock('../../../../src/apps/obo/users/user.validation.js', () => ({
  listUsersValidator: {},
  createUserValidator: {},
  assignUserRoleValidator: {},
}))

vi.mock('../../../../src/apps/obo/users/user.controller.js', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  assignUserRole: vi.fn(),
}))

const authorization = await import('../../../../src/apps/obo/authorization/authorization.service.js')
await import('../../../../src/apps/obo/users/user.routes.js')

describe('OBO user route authorization', () => {
  it('defines resource authorization for role management', () => {
    expect(authorization.authorizeOBOResource).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'obo_users',
      action: 'manage',
      getResourceId: expect.any(Function),
      loadResource: expect.any(Function),
    }))
  })
})
