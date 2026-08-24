const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const findAllUsers = async ({ skip, take, filters = {}, orderBy }) => {
  const where = {}

  if (filters.email) {
    where.email = {
      contains: filters.email,
      mode: "insensitive",
    }
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive === "true"
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
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
    prisma.user.count({ where }),
  ])

  return {
    users,
    total,
  }
}

const createUser = async ({ email, roleId, passwordHash }, db = prisma) => {
  return db.user.create({
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
