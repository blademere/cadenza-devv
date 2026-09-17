import { describe, expect, it, vi, beforeEach } from 'vitest'

const prisma = {
  user: { findUnique: vi.fn() },
  appMembership: { findUnique: vi.fn() },
  role: { findUnique: vi.fn() },
  appMembershipRole: { findMany: vi.fn() },
  app: { findUnique: vi.fn() },
  module: { findMany: vi.fn() },
}

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => prisma,
}))

const { getUserAuthorizationContext } = await import('../../../../src/platform/authorization/authorization.repository.js')

describe('authorization repository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns shared appointments:read when it is granted to an application-owned role', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 42, isActive: true })
    prisma.appMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      isActive: true,
      app: { id: 'obo-app', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      roles: [{
        role: {
          id: 7,
          name: 'receiving_officer',
          permissions: [{
            permission: {
              action: 'read',
              module: { key: 'appointments', isActive: true },
            },
          }],
        },
      }],
    })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'obo-app' })).resolves.toEqual({
      userId: 42,
      app: { id: 'obo-app', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 7, name: 'receiving_officer' }],
      permissions: [{ resource: 'appointments', action: 'read' }],
    })
  })
})
