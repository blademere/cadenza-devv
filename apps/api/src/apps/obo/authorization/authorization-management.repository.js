import { getPrismaClient } from '../../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listModules = async () => prisma.module.findMany({
  where: { key: { startsWith: 'obo_' } },
  orderBy: { key: 'asc' },
  include: { permissions: { orderBy: { action: 'asc' }, select: { id: true, action: true, createdAt: true } } },
})

const findModuleById = (id) => prisma.module.findUnique({ where: { id: Number(id) }, include: { permissions: true } })
const findModuleByKey = (key) => prisma.module.findUnique({ where: { key } })
const createModule = (data) => prisma.module.create({ data, include: { permissions: true } })
const setModuleActive = (id, isActive) => prisma.module.update({ where: { id: Number(id) }, data: { isActive }, include: { permissions: true } })
const createPermission = (data) => prisma.permission.create({ data, include: { module: true } })
const findPermissionById = (id) => prisma.permission.findUnique({ where: { id: Number(id) }, include: { module: true } })

const listRoles = async (appId) => {
  if (!appId) return []
  return prisma.role.findMany({
    where: { appId },
    orderBy: { name: 'asc' },
    include: { permissions: { orderBy: { permissionId: 'asc' }, include: { permission: { include: { module: true } } } } },
  })
}

const findRoleById = (id, appId) => prisma.role.findFirst({
  where: { id: Number(id), appId },
})
const findRoleForApp = (roleId, appId) => prisma.role.findFirst({ where: { id: Number(roleId), appId } })
const listRoleIdsByModuleId = (moduleId) => prisma.rolePermission.findMany({ where: { permission: { moduleId: Number(moduleId) } }, select: { roleId: true }, distinct: ['roleId'] })

const createRole = async ({ appId, name, description, membershipId }) => prisma.$transaction(async (tx) => {
  const membership = await tx.appMembership.findFirst({
    where: { id: membershipId, appId, isActive: true, app: { isActive: true } },
    select: { id: true },
  })
  if (!membership) return null

  const role = await tx.role.create({ data: { appId, name, description } })
  await tx.appMembershipRole.create({ data: { membershipId, roleId: role.id } })
  return tx.role.findFirst({
    where: { id: role.id, appId },
    include: { permissions: { include: { permission: { include: { module: true } } } } },
  })
})

const findMembershipById = (membershipId, appId) => prisma.appMembership.findFirst({
  where: { id: membershipId, appId, isActive: true, app: { isActive: true } },
  select: { id: true },
})

const listMembershipRoles = (membershipId, appId) => prisma.appMembershipRole.findMany({
  where: {
    membershipId,
    membership: { appId, isActive: true, app: { isActive: true } },
    role: { appId },
  },
  include: { role: { include: { permissions: { include: { permission: { include: { module: true } } } } } } },
})

const replaceRolePermissions = async (roleId, appId, permissionIds) => prisma.$transaction(async (tx) => {
  const role = await tx.role.findFirst({
    where: { id: Number(roleId), appId },
    select: { id: true },
  })
  if (!role) return null

  const normalizedPermissionIds = permissionIds.map(Number)
  if (normalizedPermissionIds.length) {
    const permissions = await tx.permission.findMany({
      where: {
        id: { in: normalizedPermissionIds },
        module: { key: { startsWith: 'obo_' } },
      },
      select: { id: true },
    })
    if (permissions.length !== new Set(normalizedPermissionIds).size) return undefined
  }

  await tx.rolePermission.deleteMany({ where: { roleId: role.id } })
  if (normalizedPermissionIds.length) {
    await tx.rolePermission.createMany({
      data: normalizedPermissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    })
  }
  return tx.role.findFirst({
    where: { id: role.id, appId },
    include: { permissions: { include: { permission: { include: { module: true } } } } },
  })
})

const replaceMembershipRoles = async (membershipId, appId, roleIds) => prisma.$transaction(async (tx) => {
  const membership = await tx.appMembership.findFirst({
    where: { id: membershipId, appId, isActive: true, app: { isActive: true } },
    select: { id: true },
  })
  if (!membership) return null

  const normalizedRoleIds = roleIds.map(Number)
  const roles = await tx.role.findMany({ where: { id: { in: normalizedRoleIds }, appId }, select: { id: true } })
  if (roles.length !== new Set(normalizedRoleIds).size) return undefined

  await tx.appMembershipRole.deleteMany({ where: { membershipId } })
  if (roles.length) await tx.appMembershipRole.createMany({ data: roles.map(({ id: roleId }) => ({ membershipId, roleId })), skipDuplicates: true })
  return tx.appMembershipRole.findMany({ where: { membershipId }, include: { role: true } })
})

export {
  listModules,
  findModuleById,
  findModuleByKey,
  createModule,
  setModuleActive,
  createPermission,
  findPermissionById,
  listRoles,
  findRoleById,
  findRoleForApp,
  listRoleIdsByModuleId,
  createRole,
  findMembershipById,
  listMembershipRoles,
  replaceRolePermissions,
  replaceMembershipRoles,
}
