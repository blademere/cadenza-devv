import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const list = async ({ appId, skip, take, search }) => {
  const membershipWhere = {
    appId,
    isActive: true,
    app: { isActive: true },
  }
  const searchWhere = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { person: { firstName: { contains: search, mode: 'insensitive' } } },
          { person: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : {}

  const where = { appMemberships: { some: membershipWhere }, ...searchWhere }
  const select = {
    id: true,
    email: true,
    isActive: true,
    person: {
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        email: true,
        phone: true,
        isActive: true,
      },
    },
    appMemberships: {
      where: membershipWhere,
      select: {
        id: true,
        isActive: true,
        roles: {
          where: { role: { appId } },
          select: { role: { select: { id: true, name: true, description: true } } },
        },
      },
    },
    _count: {
      select: {
        cadenzaStaff: { where: { appId } },
        cadenzaCustomers: { where: { appId } },
        cadenzaInstructors: { where: { appId } },
      },
    },
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: [{ email: 'asc' }], select }),
    prisma.user.count({ where }),
  ])

  return {
    actors: users.map((user) => ({
      ...user,
      membership: user.appMemberships[0] ?? null,
      appMemberships: undefined,
      roleNames: user.appMemberships[0]?.roles.map(({ role }) => role.name) ?? [],
      actorTypes: [
        ...(user._count.cadenzaStaff ? ['STAFF'] : []),
        ...(user._count.cadenzaCustomers ? ['CUSTOMER'] : []),
        ...(user._count.cadenzaInstructors ? ['INSTRUCTOR'] : []),
      ],
      counts: {
        staff: user._count.cadenzaStaff,
        customer: user._count.cadenzaCustomers,
        instructor: user._count.cadenzaInstructors,
      },
      _count: undefined,
    })),
    total,
  }
}

const findByUserId = async (userId, appId) => {
  const result = await list({ appId, skip: 0, take: 1 })
  return result.actors.find((actor) => actor.id === Number(userId)) ?? null
}

export { list, findByUserId }
