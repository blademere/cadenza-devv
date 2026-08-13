const crypto = require("crypto")
const { getPrismaClient } = require("../../infrastructure/database/prisma")

const prisma = getPrismaClient()

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },

    include: {
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

const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: {
      id: Number(id),
    },

    include: {
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

const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex")
}

const createRefreshTokenRecord = async ({ token, userId, expiresAt }) => {
  const tokenHash = hashRefreshToken(token)

  return prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: Number(userId),
      expiresAt,
    },
  })
}

const findRefreshToken = async (token) => {
  const tokenHash = hashRefreshToken(token)

  return prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },

    include: {
      user: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  })
}

const revokeRefreshToken = async (tokenId) => {
  return prisma.refreshToken.update({
    where: {
      id: tokenId,
    },

    data: {
      revokedAt: new Date(),
    },
  })
}

const revokeAllRefreshTokensForUser = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: {
      userId: Number(userId),
      revokedAt: null,
    },

    data: {
      revokedAt: new Date(),
    },
  })
}

module.exports = {
  findUserByEmail,
  findUserById,
  hashRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
}
