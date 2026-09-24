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

  it('resolves authorization through an active application membership', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 42, isActive: true })
    prisma.appMembership.findUnique.mockResolvedValue({
      id: 'membership-1',
      isActive: true,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      roles: [{
        role: {
          id: 3,
          name: 'receiving_officer',
          permissions: [{
            permission: {
              action: 'read',
              module: { key: 'obo_applications', isActive: true },
            },
          }],
        },
      }],
    })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'app-1' })).resolves.toEqual({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'obo_applications', action: 'read' }],
    })
  })

  it('returns null when the user has no active membership for the app', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 42, isActive: true })
    prisma.appMembership.findUnique.mockResolvedValue(null)

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'other-app' })).resolves.toBeNull()
  })

  it('returns null for an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 42, isActive: false })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'app-1' })).resolves.toBeNull()
  })
})
