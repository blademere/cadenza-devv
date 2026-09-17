import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findAllUsers = async ({ appId, skip, take, filters = {}, orderBy }) => {
  if (appId) {
    const membershipWhere = {
      appId,
      isActive: true,
      app: { isActive: true },
      user: {
        ...(filters.email ? { email: { contains: filters.email, mode: 'insensitive' } } : {}),
        ...(filters.isActive !== undefined ? { isActive: filters.isActive === 'true' } : {}),
      },
    }

    const [memberships, total] = await Promise.all([
      prisma.appMembership.findMany({
        skip,
        take,
        where: membershipWhere,
        orderBy: (() => {
          const [field, direction] = Object.entries(orderBy ?? { createdAt: 'desc' })[0]
          return { user: { [field]: direction } }
        })(),
        select: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          roles: {
            where: { role: { appId } },
            include: { role: true },
          },
        },
      }),
      prisma.appMembership.count({ where: membershipWhere }),
    ])

    return {
      users: memberships.map(({ user, roles }) => ({
        ...user,
        roles: roles.map(({ role }) => role),
      })),
      total,
    }
  }

  const where = {
    ...(filters.email ? { email: { contains: filters.email, mode: 'insensitive' } } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive === 'true' } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return { users, total }
}

const findUserByEmail = async (email, db = prisma) => db.user.findUnique({
  where: { email },
  select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
})

const createUser = async ({ email, passwordHash }, db = prisma) => db.user.create({
  data: { email, passwordHash },
  select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
})

const findUser = async (userId, db = prisma) => db.user.findUnique({
  where: { id: Number(userId) },
  select: { id: true, email: true, isActive: true, createdAt: true, updatedAt: true },
})

export { findAllUsers, findUserByEmail, createUser, findUser }
