import { getUserAuthorizationContext, listActiveModules } from './authorization-context.repository.js'

const getAuthorizationContextResponse = async ({ userId, appId }) => {
  const [context, modules] = await Promise.all([
    getUserAuthorizationContext({ userId, appId }),
    listActiveModules(),
  ])

  const permissions = new Set(
    (context?.permissions ?? []).map(({ resource, action }) => `${resource}:${action}`),
  )

  return {
    userId: context?.userId ?? Number(userId),
    app: context?.app ?? null,
    membership: context?.membership ?? null,
    roles: context?.roles ?? [],
    permissions: [...permissions].sort(),
    modules: (modules ?? []).map(({ key, name, description, isActive }) => ({
      key,
      name,
      description,
      isActive,
    })),
  }
}

export { getAuthorizationContextResponse }
