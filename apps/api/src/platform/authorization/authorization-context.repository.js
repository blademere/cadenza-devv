import { getPrismaClient } from '../../infrastructure/database/prisma.js'

const prisma = getPrismaClient()

const getUserAuthorizationContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      isActive: true,
      role: {
        select: {
          id: true,
          name: true,
          permissions: {
            select: {
              permission: {
                select: {
                  action: true,
                  module: {
                    select: { key: true, name: true, isActive: true },
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

  const permissions = user.role.permissions
    .map(({ permission }) => permission)
    .filter(({ module }) => module.isActive)
    .map(({ action, module }) => ({
      resource: module.key,
      action,
      moduleName: module.name,
    }))

  return {
    userId: user.id,
    role: { id: user.role.id, name: user.role.name },
    permissions,
  }
}

const listActiveModules = () => prisma.module.findMany({
  where: { isActive: true },
  orderBy: { key: 'asc' },
  select: { id: true, key: true, name: true, description: true, isActive: true },
})

export { getUserAuthorizationContext, listActiveModules }
