import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getUserAuthorizationContext = async ({ userId, appId }) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, isActive: true },
  })

  if (!user || !user.isActive || !appId) return null

  const membership = await prisma.appMembership.findUnique({
    where: { appId_userId: { appId, userId: Number(userId) } },
    select: {
      id: true,
      isActive: true,
      app: { select: { id: true, key: true, name: true, isActive: true } },
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      action: true,
                      module: { select: { key: true, isActive: true } },
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

  if (!membership || !membership.isActive || !membership.app.isActive) return null

  const roles = membership.roles.map(({ role }) => ({ id: role.id, name: role.name }))
  const permissions = new Map()

  for (const { role } of membership.roles) {
    for (const { permission } of role.permissions) {
      if (permission.module.isActive) {
        permissions.set(`${permission.module.key}:${permission.action}`, {
          resource: permission.module.key,
          action: permission.action,
        })
      }
    }
  }

  return {
    userId: user.id,
    app: membership.app,
    membership: { id: membership.id },
    roles,
    permissions: [...permissions.values()],
  }
}

const getUserPermissions = async ({ userId, appId }) => {
  const context = await getUserAuthorizationContext({ userId, appId })
  return context?.permissions ?? []
}

const findRoleById = async (roleId) => prisma.role.findUnique({
  where: { id: Number(roleId) },
  select: {
    id: true,
    name: true,
    description: true,
    permissions: {
      select: {
        permission: {
          select: {
            action: true,
            module: { select: { key: true, isActive: true } },
          },
        },
      },
    },
  },
})

const findUserIdsByRoleId = async (roleId) => {
  const memberships = await prisma.appMembership.findMany({
    where: { roles: { some: { roleId: Number(roleId) } } },
    select: { userId: true },
    distinct: ['userId'],
  })
  return memberships.map(({ userId }) => userId)
}

export { getUserAuthorizationContext, getUserPermissions, findRoleById, findUserIdsByRoleId }
