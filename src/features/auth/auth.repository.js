const crypto = require('crypto')

const { getPrismaClient } = require('../../infrastructure/database/prisma')

const prisma = getPrismaClient()

const userInclude = {
  role: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
}

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
    include: userInclude,
  })
}

const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id: Number(id) },
    include: userInclude,
  })
}

const findOAuthAccount = async ({ provider, providerAccountId }) => {
  return prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: {
        include: userInclude,
      },
    },
  })
}

const createOAuthUser = async ({ email, provider, providerAccountId, roleName }) => {
  return prisma.$transaction(async (tx) => {
    const role = await tx.role.findUnique({
      where: { name: roleName },
    })

    if (!role) {
      throw new Error(`OAuth default role '${roleName}' does not exist.`)
    }

    const existingUser = await tx.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new Error('An account already exists for this email address.')
    }

    return tx.user.create({
      data: {
        email,
        passwordHash: null,
        roleId: role.id,
        oauthAccounts: {
          create: {
            provider,
            providerAccountId,
          },
        },
      },
      include: userInclude,
    })
  })
}

const linkOAuthAccount = async ({ userId, provider, providerAccountId }) => {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
  })

  if (existingAccount) {
    if (existingAccount.userId === Number(userId)) {
      return existingAccount
    }

    const error = new Error('This OAuth account is already linked to another user.')
    error.code = 'OAUTH_ACCOUNT_ALREADY_LINKED'
    throw error
  }

  return prisma.oAuthAccount.create({
    data: {
      userId: Number(userId),
      provider,
      providerAccountId,
    },
  })
}

const listOAuthAccounts = async (userId) => {
  return prisma.oAuthAccount.findMany({
    where: { userId: Number(userId) },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

const unlinkOAuthAccount = async ({ userId, provider }) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user) {
      const error = new Error('User account was not found.')
      error.code = 'USER_NOT_FOUND'
      throw error
    }

    const accounts = await tx.oAuthAccount.findMany({
      where: { userId: Number(userId) },
      select: { id: true, provider: true },
    })

    const account = accounts.find((item) => item.provider === provider)

    if (!account) {
      const error = new Error('OAuth account is not linked.')
      error.code = 'OAUTH_ACCOUNT_NOT_LINKED'
      throw error
    }

    const hasPassword = Boolean(user.passwordHash)
    const hasAnotherOAuthAccount = accounts.some((item) => item.id !== account.id)

    if (!hasPassword && !hasAnotherOAuthAccount) {
      const error = new Error('Cannot unlink the only authentication method on the account.')
      error.code = 'LAST_AUTH_METHOD'
      throw error
    }

    await tx.oAuthAccount.delete({
      where: { id: account.id },
    })

    return account
  })
}

const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const createRefreshTokenRecord = async ({ tokenId, token, userId, expiresAt }) => {
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
    where: { tokenHash },
    include: {
      user: {
        include: userInclude,
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
    where: { id: tokenId },
    include: {
      user: {
        include: userInclude,
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
    where: { id: tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

const revokeAllRefreshTokensForUser = async (userId) => {
  return prisma.refreshToken.updateMany({
    where: { userId: Number(userId), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

const rotateRefreshToken = async ({ currentTokenId, newTokenId, newTokenHash, userId, expiresAt }) => {
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
      return { success: false }
    }

    await tx.refreshToken.create({
      data: {
        id: newTokenId,
        tokenHash: newTokenHash,
        userId: Number(userId),
        expiresAt,
      },
    })

    return { success: true }
  })
}

const deleteExpiredRefreshTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
}

module.exports = {
  findUserByEmail,
  findUserById,
  findOAuthAccount,
  createOAuthUser,
  linkOAuthAccount,
  listOAuthAccounts,
  unlinkOAuthAccount,
  hashRefreshToken,
  createRefreshTokenRecord,
  findRefreshToken,
  findRefreshTokenById,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
  rotateRefreshToken,
  deleteExpiredRefreshTokens,
}
