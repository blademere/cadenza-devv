const crypto = require('crypto')

const { getPrismaClient } = require('../../infrastructure/database/prisma')

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
  return crypto.createHash('sha256').update(token).digest('hex')
}

const createRefreshTokenRecord = async ({
  tokenId,
  token,
  userId,
  expiresAt,
}) => {
  const tokenHash = hashRefreshToken(token)

  return prisma.refreshToken.create({
    data: {
      id: tokenId,
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

      replacedByToken: {
        select: {
          id: true,
          revokedAt: true,
          expiresAt: true,
        },
      },
    },
  })
}

const findRefreshTokenById = async (tokenId) => {
  return prisma.refreshToken.findUnique({
    where: {
      id: tokenId,
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

      replacedByToken: {
        select: {
          id: true,
          revokedAt: true,
          expiresAt: true,
        },
      },
    },
  })
}

const revokeRefreshToken = async (tokenId) => {
  return prisma.refreshToken.updateMany({
    where: {
      id: tokenId,
      revokedAt: null,
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

const rotateRefreshToken = async ({
  currentTokenId,
  newTokenId,
  newTokenHash,
  userId,
  expiresAt,
}) => {
  return prisma.$transaction(async (tx) => {
    const consumed = await tx.refreshToken.updateMany({
      where: {
        id: currentTokenId,
        userId: Number(userId),
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
        replacedByTokenId: newTokenId,
      },
    })

    if (consumed.count !== 1) {
      return {
        success: false,
      }
    }

    await tx.refreshToken.create({
      data: {
        id: newTokenId,
        tokenHash: newTokenHash,
        userId: Number(userId),
        expiresAt,
      },
    })

    return {
      success: true,
    }
  })
}

const deleteExpiredRefreshTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  })
}

module.exports = {
  findUserByEmail,
  findUserById,
  hashRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
  deleteExpiredRefreshTokens,
}
