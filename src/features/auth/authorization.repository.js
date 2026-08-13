const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const userHasPermission = async (userId, moduleKey, action) => {
  const permission = await prisma.permission.findFirst({
    where: {
      module: {
        key: moduleKey,
      },

      action,

      roles: {
        some: {
          role: {
            users: {
              some: {
                id: Number(userId),
              },
            },
          },
        },
      },
    },

    select: {
      id: true,
    },
  })

  return Boolean(permission)
}

const findRoleById = async (roleId) => {
  return prisma.role.findUnique({
    where: {
      id: Number(roleId),
    },

    select: {
      id: true,
      name: true,
      description: true,
    },
  })
}

module.exports = {
  userHasPermission,
  findRoleById,
}
