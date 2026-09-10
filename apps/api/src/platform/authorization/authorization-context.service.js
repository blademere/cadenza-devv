import { getUserAuthorizationContext, listActiveModules } from './authorization-context.repository.js'

const getAuthorizationContextResponse = async (userId) => {
  const [context, modules] = await Promise.all([
    getUserAuthorizationContext(userId),
    listActiveModules(),
  ])

  const permissions = new Set(
    (context?.permissions ?? []).map(({ resource, action }) => `${resource}:${action}`),
  )

  return {
    role: context?.role ?? null,
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
