const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const getUserPermissions = async (userId) => {
  const permissions = await prisma.permission.findMany({
    where: {
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
      action: true,

      module: {
        select: {
          key: true,
        },
      },
    },
  })

  return permissions.map(
    (permission) => `${permission.module.key}:${permission.action}`,
  )
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

const findUserIdsByRoleId = async (roleId) => {
  const users = await prisma.user.findMany({
    where: {
      roleId: Number(roleId),
    },

    select: {
      id: true,
    },
  })

  return users.map((user) => user.id)
}

module.exports = {
  getUserPermissions,
  findRoleById,
  findUserIdsByRoleId,
}
