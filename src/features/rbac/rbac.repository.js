const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const findPermissionForUser = async (userId, moduleKey, action) => {
  return prisma.rolePermission.findFirst({
    where: {
      role: {
        users: {
          some: {
            id: Number(userId),
          },
        },
      },

      permission: {
        action,

        module: {
          key: moduleKey,
        },
      },
    },

    select: {
      permissionId: true,
    },
  })
}

module.exports = {
  findPermissionForUser,
}
