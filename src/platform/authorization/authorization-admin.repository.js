const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const listModules = () => prisma.module.findMany({
  orderBy: { key: 'asc' },
  include: {
    permissions: {
      orderBy: { action: 'asc' },
      select: { id: true, action: true, createdAt: true },
    },
  },
})

const createModule = (data) => prisma.module.create({
  data,
  include: { permissions: true },
})

const findModuleById = (id) => prisma.module.findUnique({
  where: { id },
  include: { permissions: true },
})

const findModuleByKey = (key) => prisma.module.findUnique({ where: { key } })

const createPermission = (data) => prisma.permission.create({
  data,
  include: { module: true },
})

const findPermissionById = (id) => prisma.permission.findUnique({ where: { id } })

const listRoles = () => prisma.role.findMany({
  orderBy: { name: 'asc' },
  include: {
    permissions: {
      orderBy: { permissionId: 'asc' },
      include: {
        permission: {
          include: { module: true },
        },
      },
    },
  },
})

const findRoleById = (id) => prisma.role.findUnique({ where: { id } })

const replaceRolePermissions = async (roleId, permissionIds) => prisma.$transaction(async (tx) => {
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

const findUserIdsByRoleId = (roleId) => prisma.user.findMany({
  where: { roleId },
  select: { id: true },
})

module.exports = {
  listModules,
  createModule,
  findModuleById,
  findModuleByKey,
  createPermission,
  findPermissionById,
  listRoles,
  findRoleById,
  replaceRolePermissions,
  findUserIdsByRoleId,
}
