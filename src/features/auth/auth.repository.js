const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },

    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      isActive: true,
    },
  })
}

const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id: Number(id),
    },

    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  })
}

module.exports = {
  findUserByEmail,
  findUserById,
}
