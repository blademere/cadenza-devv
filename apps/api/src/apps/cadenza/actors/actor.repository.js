import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const actorSelect = (appId) => ({
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
      cadenzaStaff: { where: { appId }, select: { id: true, staffType: true, status: true } },
      cadenzaCustomers: { where: { appId }, select: { id: true, status: true } },
      cadenzaInstructors: { where: { appId }, select: { id: true, specialty: true, status: true } },
    },
  },
  appMemberships: {
    where: { appId, isActive: true, app: { isActive: true } },
    select: {
      id: true,
      isActive: true,
      roles: {
        where: { role: { appId } },
        select: { role: { select: { id: true, name: true, description: true } } },
      },
    },
  },
})

const toActor = (user) => {
  const person = user.person
  const staff = person?.cadenzaStaff ?? []
  const customers = person?.cadenzaCustomers ?? []
  const instructors = person?.cadenzaInstructors ?? []
  const membership = user.appMemberships[0] ?? null

  return {
    id: user.id,
    email: user.email,
    isActive: user.isActive,
    person: person ? {
      id: person.id,
      firstName: person.firstName,
      middleName: person.middleName,
      lastName: person.lastName,
      suffix: person.suffix,
      email: person.email,
      phone: person.phone,
      isActive: person.isActive,
    } : null,
    membership,
    roleNames: membership?.roles.map(({ role }) => role.name) ?? [],
    actorTypes: [
      ...(staff.length ? ['STAFF'] : []),
      ...(customers.length ? ['CUSTOMER'] : []),
      ...(instructors.length ? ['INSTRUCTOR'] : []),
    ],
    profiles: {
      staff: staff.map(({ id, staffType, status }) => ({ id, staffType, status })),
      customer: customers.map(({ id, status }) => ({ id, status })),
      instructor: instructors.map(({ id, specialty, status }) => ({ id, specialty, status })),
    },
  }
}

const list = async ({ appId, skip, take, search }) => {
  const membershipWhere = { appId, isActive: true, app: { isActive: true } }
  const where = {
    appMemberships: { some: membershipWhere },
    ...(search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { person: { firstName: { contains: search, mode: 'insensitive' } } },
        { person: { lastName: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: [{ email: 'asc' }],
      select: actorSelect(appId),
    }),
    prisma.user.count({ where }),
  ])

  return { actors: users.map(toActor), total }
}

const findByUserId = async (userId, appId) => {
  const user = await prisma.user.findFirst({
    where: {
      id: Number(userId),
      appMemberships: { some: { appId, isActive: true, app: { isActive: true } } },
    },
    select: actorSelect(appId),
  })
  return user ? toActor(user) : null
}

export { list, findByUserId }
