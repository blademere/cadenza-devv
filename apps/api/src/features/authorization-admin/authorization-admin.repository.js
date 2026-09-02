import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const listModules = () =>
  prisma.module.findMany({
    orderBy: { key: 'asc' },
    include: {
      permissions: {
        orderBy: { action: 'asc' },
        select: { id: true, action: true, createdAt: true },
      },
    },
  })

const createModule = (data) =>
  prisma.module.create({
    data,
    include: { permissions: true },
  })

const findModuleById = (id) =>
  prisma.module.findUnique({
    where: { id },
    include: { permissions: true },
  })

const findModuleByKey = (key) => prisma.module.findUnique({ where: { key } })

const setModuleActive = (id, isActive) =>
  prisma.module.update({
    where: { id },
    data: { isActive },
    include: { permissions: true },
  })

const createPermission = (data) =>
  prisma.permission.create({
    data,
    include: { module: true },
  })

const findPermissionById = (id) =>
  prisma.permission.findUnique({
    where: { id },
    include: { module: true },
  })

const findPermissionByModuleAction = (moduleKey, action) =>
  prisma.permission.findFirst({
    where: {
      action,
      module: { key: moduleKey },
    },
    include: { module: true },
  })

const listRoles = () =>
  prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: {
      permissions: {
        orderBy: { permissionId: 'asc' },
        include: { permission: { include: { module: true } } },
      },
    },
  })

const findRoleById = (id) => prisma.role.findUnique({ where: { id } })

const findRoleWithPermissions = (id) =>
  prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        select: { permissionId: true },
      },
    },
  })

const findUserById = (id) =>
  prisma.user.findUnique({
    where: { id },
    select: { id: true, roleId: true },
  })

const countRolesWithPermission = (permissionId, excludedRoleId) =>
  prisma.role.count({
    where: {
      ...(excludedRoleId ? { id: { not: excludedRoleId } } : {}),
      permissions: {
        some: { permissionId },
      },
    },
  })

const replaceRolePermissions = async (roleId, permissionIds) =>
  prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } })
    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      })
    }
    return tx.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: { include: { module: true } } },
        },
      },
    })
  })

export default {
  listModules,
  createModule,
  findModuleById,
  findModuleByKey,
  setModuleActive,
  createPermission,
  findPermissionById,
  findPermissionByModuleAction,
  listRoles,
  findRoleById,
  findRoleWithPermissions,
  findUserById,
  countRolesWithPermission,
  replaceRolePermissions,
}
