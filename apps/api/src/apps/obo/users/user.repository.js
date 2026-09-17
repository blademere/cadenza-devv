import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const findAllOBOUsers = async ({ appId, skip, take, filters = {}, orderBy }) => {
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
      orderBy: orderBy
        ? Object.fromEntries(
            Object.entries(orderBy).map(([field, direction]) => [
              field === 'email' || field === 'isActive' || field === 'createdAt' || field === 'updatedAt'
                ? { user: { [field]: direction } }
                : { user: { [field]: direction } },
              direction,
            ])
          )
        : { user: { createdAt: 'desc' } },
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

  const users = memberships.map(({ user, roles }) => ({
    ...user,
    roles: roles.map(({ role }) => role),
  }))

  return { users, total }
}

export { findAllOBOUsers }
