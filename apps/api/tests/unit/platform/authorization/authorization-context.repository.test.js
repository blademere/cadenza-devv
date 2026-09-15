import { describe, expect, it, vi, beforeEach } from 'vitest'

const prisma = {
  user: {
    findUnique: vi.fn(),
  },
  module: {
    findMany: vi.fn(),
  },
}

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => prisma,
}))

const { getUserAuthorizationContext } = await import('../../../../src/platform/authorization/authorization-context.repository.js')

describe('authorization context repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves authorization through an active app membership', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      isActive: true,
      appMemberships: [{
        id: 'membership-1',
        app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
        roles: [{
          role: {
            id: 3,
            name: 'receiving_officer',
            permissions: [{
              permission: {
                action: 'read',
                module: { key: 'obo_plan_permits', name: 'Plan Permits', isActive: true },
              },
            }],
          },
        }],
      }],
    })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'app-1' })).resolves.toEqual({
      userId: 42,
      app: { id: 'app-1', key: 'obo', name: 'One-Stop Business Office', isActive: true },
      membership: { id: 'membership-1' },
      roles: [{ id: 3, name: 'receiving_officer' }],
      permissions: [{ resource: 'obo_plan_permits', action: 'read', moduleName: 'Plan Permits' }],
    })

    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42 },
      select: expect.objectContaining({
        appMemberships: expect.objectContaining({
          where: expect.objectContaining({
            appId: 'app-1',
            isActive: true,
            app: { isActive: true },
          }),
        }),
      }),
    }))
  })

  it('returns null when the user has no active membership for the app', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      isActive: true,
      appMemberships: [],
    })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'other-app' })).resolves.toBeNull()
  })

  it('returns null for an inactive user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 42,
      isActive: false,
      appMemberships: [],
    })

    await expect(getUserAuthorizationContext({ userId: 42, appId: 'app-1' })).resolves.toBeNull()
  })
})
