import { beforeEach, describe, expect, it, vi } from 'vitest'

const prisma = {
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
}

vi.mock('../../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => prisma,
}))

const { findAllUsers } = await import('../../../../src/features/users/user.repository.js')

describe('user repository application isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.user.findMany.mockResolvedValue([])
    prisma.user.count.mockResolvedValue(0)
  })

  it('applies the application scope to both users and count', async () => {
    await findAllUsers({
      skip: 0,
      take: 20,
      appId: 7,
      filters: {},
      orderBy: { createdAt: 'desc' },
    })

    const findManyArgs = prisma.user.findMany.mock.calls[0][0]
    const countArgs = prisma.user.count.mock.calls[0][0]

    expect(findManyArgs.where).toEqual({
      appMemberships: {
        some: {
          appId: 7,
          isActive: true,
          app: { isActive: true },
        },
      },
    })
    expect(countArgs.where).toEqual(findManyArgs.where)
  })

  it('combines application scope with user filters', async () => {
    await findAllUsers({
      skip: 20,
      take: 20,
      appId: 7,
      filters: { email: 'obo@example.com', isActive: 'true' },
      orderBy: { email: 'asc' },
    })

    const findManyArgs = prisma.user.findMany.mock.calls[0][0]
    const countArgs = prisma.user.count.mock.calls[0][0]

    expect(findManyArgs.where).toEqual({
      email: { contains: 'obo@example.com', mode: 'insensitive' },
      isActive: true,
      appMemberships: {
        some: {
          appId: 7,
          isActive: true,
          app: { isActive: true },
        },
      },
    })
    expect(countArgs.where).toEqual(findManyArgs.where)
  })

  it('does not apply an application scope when appId is absent', async () => {
    await findAllUsers({
      skip: 0,
      take: 20,
      filters: { isActive: 'false' },
      orderBy: { createdAt: 'desc' },
    })

    const findManyArgs = prisma.user.findMany.mock.calls[0][0]
    const countArgs = prisma.user.count.mock.calls[0][0]

    expect(findManyArgs.where).toEqual({ isActive: false })
    expect(countArgs.where).toEqual({ isActive: false })
  })

  it('uses the same active application membership scope when selecting memberships', async () => {
    await findAllUsers({
      skip: 0,
      take: 20,
      appId: 7,
      filters: {},
      orderBy: { createdAt: 'desc' },
    })

    const select = prisma.user.findMany.mock.calls[0][0].select

    expect(select.appMemberships.where).toEqual({
      appId: 7,
      isActive: true,
      app: { isActive: true },
    })
  })
})
