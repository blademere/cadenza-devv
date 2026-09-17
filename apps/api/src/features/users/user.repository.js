import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findAllUsers = async ({ appId, skip, take, filters = {}, orderBy }) => {
  const userWhere = {
    ...(filters.email ? { email: { contains: filters.email, mode: 'insensitive' } } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive === 'true' } : {}),
    ...(appId ? {
      appMemberships: {
        some: {
          appId,
          isActive: true,
          app: { isActive: true },
        },
      },
    } : {}),
  }

  const select = {
    id: true,
    email: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    ...(appId ? {
      appMemberships: {
        where: {
          appId,
          isActive: true,
          app: { isActive: true },
        },
        select: {
          roles: {
            where: { role: { appId } },
            select: { role: true },
          },
        },
      },
    } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      where: userWhere,
      orderBy,
      select,
    }),
    prisma.user.count({ where: userWhere }),
  ])

  return {
    users: users.map((user) => {
      if (!appId) return user

      const roles = user.appMemberships.flatMap((membership) =>
        membership.roles.map(({ role }) => role)
      )
      const { appMemberships, ...userWithoutMemberships } = user
      return { ...userWithoutMemberships, roles }
    }),
    total,
  }
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
