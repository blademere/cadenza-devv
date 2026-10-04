import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findMany, count } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
}))

vi.mock('../../../src/infrastructure/database/prisma.js', () => ({
  getPrismaClient: () => ({
    user: {
      findMany,
      count,
    },
  }),
}))

const { findAllUsers } = await import('../../../src/features/users/user.repository.js')

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([])
  count.mockResolvedValue(0)
})

describe('findAllUsers', () => {
  it('scopes both users and total count to the requested application', async () => {
    await findAllUsers({
      skip: 0,
      take: 10,
      filters: {},
      orderBy: { createdAt: 'desc' },
      appId: 7,
    })

    const expectedWhere = {
      appMemberships: {
        some: {
          appId: 7,
          isActive: true,
          app: { isActive: true },
        },
      },
    }

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    expect(count).toHaveBeenCalledWith({ where: expectedWhere })
  })

  it('keeps email and active filters alongside application scope', async () => {
    await findAllUsers({
      skip: 10,
      take: 10,
      filters: {
        email: 'obo@example.com',
        isActive: 'true',
      },
      orderBy: { email: 'asc' },
      appId: 7,
    })

    const expectedWhere = {
      email: { contains: 'obo@example.com', mode: 'insensitive' },
      isActive: true,
      appMemberships: {
        some: {
          appId: 7,
          isActive: true,
          app: { isActive: true },
        },
      },
    }

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    expect(count).toHaveBeenCalledWith({ where: expectedWhere })
  })

  it('does not add application scope when no application is requested', async () => {
    await findAllUsers({
      skip: 0,
      take: 10,
      filters: { isActive: 'false' },
      orderBy: { createdAt: 'desc' },
    })

    const expectedWhere = { isActive: false }

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }))
    expect(count).toHaveBeenCalledWith({ where: expectedWhere })
  })
})
