const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const getUserAuthorizationContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: Number(userId),
    },
    select: {
      id: true,
      isActive: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  action: true,
                  module: {
                    select: {
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user || !user.isActive) {
    return null
  }

  return {
    userId: user.id,
    role: user.role.name,
    permissions: user.role.permissions.map(({ permission }) => ({
      resource: permission.module.key,
      action: permission.action,
    })),
  }
}

const getUserPermissions = async (userId) => {
  const context = await getUserAuthorizationContext(userId)
  return context?.permissions ?? []
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
  getUserAuthorizationContext,
  getUserPermissions,
  findRoleById,
  findUserIdsByRoleId,
}
