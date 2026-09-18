import { describe, expect, it, vi } from 'vitest'

const authorization = {
  authorizeResource: vi.fn(() => (_req, _res, next) => next()),
}

vi.mock('../../../../src/common/middleware/index.js', () => ({
  asyncHandler: (handler) => handler,
  validate: () => (_req, _res, next) => next(),
  idempotency: () => (_req, _res, next) => next(),
}))

vi.mock('../../../../src/platform/authorization/authorization.middleware.js', () => ({
  default: vi.fn(() => (_req, _res, next) => next()),
  authorizeResource: authorization.authorizeResource,
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

await import('../../../../src/apps/obo/users/user.routes.js')

describe('OBO user route authorization', () => {
  it('defines resource authorization for role management', () => {
    expect(authorization.authorizeResource).toHaveBeenCalledWith(expect.objectContaining({
      resource: 'obo_users',
      action: 'manage',
      getResourceId: expect.any(Function),
      loadResource: expect.any(Function),
    }))
  })
})
