const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const findAllUsers = async ({ skip, take }) => {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    }),

    prisma.user.count(),
  ])

  return {
    users,
    total,
  }
}

const createUser = async ({ email, roleId, passwordHash }) => {
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      roleId,
    },

    select: {
      id: true,
      email: true,
      isActive: true,
      createdAt: true,

      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  })
}

module.exports = {
  findAllUsers,
  createUser,
}
