import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getAppByKey = async (key) => prisma.app.findUnique({
  where: { key },
})

const getAppById = async (id) => prisma.app.findUnique({
  where: { id },
})

const listActiveApps = async () => prisma.app.findMany({
  where: { isActive: true },
  orderBy: { key: 'asc' },
})

const getMembership = async ({ userId, appId }) => prisma.appMembership.findUnique({
  where: {
    appId_userId: {
      appId,
      userId: Number(userId),
    },
  },
  include: {
    app: true,
    roles: {
      where: { role: { appId } },
      include: { role: true },
    },
  },
})

const getMembershipById = async (membershipId) => prisma.appMembership.findUnique({
  where: { id: membershipId },
  include: {
    app: true,
    roles: {
      include: { role: true },
    },
  },
})

const listUserApps = async (userId) => prisma.appMembership.findMany({
  where: {
    userId: Number(userId),
    isActive: true,
    app: { isActive: true },
  },
  include: { app: true },
  orderBy: { app: { key: 'asc' } },
})

const createMembership = async ({ userId, appId }) => prisma.appMembership.create({
  data: {
    userId: Number(userId),
    appId,
  },
  include: { app: true, roles: { include: { role: true } } },
})

const disableMembership = async ({ userId, appId }) => prisma.appMembership.update({
  where: {
    appId_userId: {
      appId,
      userId: Number(userId),
    },
  },
  data: { isActive: false },
})

const assignMembershipRole = async ({ membershipId, roleId, appId }) => {
  const membership = await prisma.appMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, appId: true, isActive: true, app: { select: { isActive: true } } },
  })
  if (!membership || !membership.isActive || !membership.app.isActive || (appId && membership.appId !== appId)) return null

  const role = await prisma.role.findFirst({
    where: { id: Number(roleId), appId: membership.appId },
    select: { id: true },
  })
  if (!role) return null

  return prisma.appMembershipRole.upsert({
    where: {
      membershipId_roleId: { membershipId, roleId: Number(roleId) },
    },
    update: {},
    create: {
      membershipId,
      roleId: Number(roleId),
    },
    include: { role: true },
  })
}

const removeMembershipRole = async ({ membershipId, roleId, appId }) => {
  if (appId) {
    const membership = await prisma.appMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, appId: true, isActive: true, app: { select: { isActive: true } } },
    })
    if (!membership || !membership.isActive || !membership.app.isActive || membership.appId !== appId) return null
  }

  return prisma.appMembershipRole.delete({
    where: {
      membershipId_roleId: { membershipId, roleId: Number(roleId) },
    },
  })
}

const listMembershipRoles = async (membershipId) => prisma.appMembershipRole.findMany({
  where: { membershipId },
  include: { role: true },
  orderBy: { role: { name: 'asc' } },
})

export {
  getAppByKey,
  getAppById,
  listActiveApps,
  getMembership,
  getMembershipById,
  listUserApps,
  createMembership,
  disableMembership,
  assignMembershipRole,
  removeMembershipRole,
  listMembershipRoles,
}
