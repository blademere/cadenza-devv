import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getUserAuthorizationContext = async ({ userId, appId }) => {
  const normalizedUserId = Number(userId)
  const normalizedAppId = String(appId ?? '').trim()

  if (!Number.isInteger(normalizedUserId) || !normalizedAppId) return null

  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: {
      id: true,
      isActive: true,
      appMemberships: {
        where: {
          appId: normalizedAppId,
          isActive: true,
          app: { isActive: true },
        },
        select: {
          id: true,
          app: { select: { id: true, key: true, name: true, isActive: true } },
          roles: {
            where: { role: { appId: normalizedAppId } },
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
                          module: { select: { key: true, name: true, isActive: true } },
                        },
                      },
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

  if (!user || !user.isActive) return null

  const membership = user.appMemberships[0]
  if (!membership) return null

  const roles = membership.roles.map(({ role }) => ({ id: role.id, name: role.name }))

  const permissions = membership.roles
    .flatMap(({ role }) => role.permissions.map(({ permission }) => permission))
    .filter(({ module }) => module.isActive)
    .map(({ action, module }) => ({
      resource: module.key,
      action,
      moduleName: module.name,
    }))

  return {
    userId: user.id,
    app: membership.app,
    membership: { id: membership.id },
    roles,
    permissions,
  }
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

export { getUserAuthorizationContext, listActiveModules }
