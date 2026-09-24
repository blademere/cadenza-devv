import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getUserAuthorizationContext = async ({ userId, appId }) => {
  const normalizedUserId = Number(userId)
  const normalizedAppId = String(appId ?? '').trim()

  if (!Number.isInteger(normalizedUserId) || !normalizedAppId) return null

  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: { id: true, isActive: true },
  })

  if (!user || !user.isActive) return null

  const membership = await prisma.appMembership.findUnique({
    where: { appId_userId: { appId: normalizedAppId, userId: normalizedUserId } },
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

  // Modules are shared platform catalog records. Application ownership is
  // enforced by the app membership and app-scoped role; do not filter the
  // permission catalog by the application's key here. This allows shared
  // capabilities such as appointments to be granted to an application's roles.
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

const findUserIdsByRoleId = async (roleId, appId) => {
  const normalizedRoleId = Number(roleId)
  const normalizedAppId = String(appId ?? '').trim()
  if (!Number.isInteger(normalizedRoleId)) return []

  const role = await prisma.role.findUnique({
    where: { id: normalizedRoleId },
    select: { appId: true },
  })
  if (!role) return []
  if (normalizedAppId && role.appId !== normalizedAppId) return []

  const resolvedAppId = role.appId
  const memberships = await prisma.appMembership.findMany({
    where: {
      appId: resolvedAppId,
      isActive: true,
      app: { isActive: true },
      roles: { some: { roleId: normalizedRoleId, role: { appId: resolvedAppId } } },
    },
    select: { userId: true, appId: true },
    distinct: ['userId', 'appId'],
  })
  return memberships.map(({ userId, appId: membershipAppId }) => ({ userId, appId: membershipAppId }))
}

const listActiveModules = async ({ appId } = {}) => {
  const normalizedAppId = String(appId ?? '').trim()
  if (!normalizedAppId) return []

  const app = await prisma.app.findUnique({
    where: { id: normalizedAppId },
    select: { isActive: true },
  })
  if (!app || !app.isActive) return []

  return prisma.module.findMany({
    where: { isActive: true },
    orderBy: { key: 'asc' },
    select: { id: true, key: true, name: true, description: true, isActive: true },
  })
}

export {
  getUserAuthorizationContext,
  getUserPermissions,
  findUserIdsByRoleId,
  listActiveModules,
}
