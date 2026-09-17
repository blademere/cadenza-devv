import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const findAllUsers = async ({ skip, take, filters = {}, orderBy, appId }) => {
  const where = {
    ...(filters.email ? { email: { contains: filters.email, mode: 'insensitive' } } : {}),
    ...(filters.isActive !== undefined ? { isActive: filters.isActive === 'true' } : {}),
    ...(appId
      ? {
          appMemberships: {
            some: {
              appId,
              isActive: true,
              app: { isActive: true },
            },
          },
        }
      : {}),
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
        appMemberships: {
          where: appId
            ? { appId, isActive: true, app: { isActive: true } }
            : { isActive: true, app: { isActive: true } },
          include: { app: true, roles: { include: { role: true } } },
        },
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
