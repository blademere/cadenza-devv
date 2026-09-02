const buildAuthorizationContext = ({ context, modules, capabilities }) => {
  const permissionSet = new Set(
    (context?.permissions ?? []).map(({ resource, action }) => `${resource}:${action}`),
  )
  const activeModuleKeys = new Set(
    (modules ?? []).filter((module) => module.isActive !== false).map((module) => module.key),
  )

  const navigation = capabilities.map((capability) => ({
    ...capability,
    visible:
      activeModuleKeys.has(capability.moduleKey) &&
      permissionSet.has(capability.permission),
  }))

  return {
    role: context?.role ?? null,
    permissions: [...permissionSet].sort(),
    modules: (modules ?? []).map(({ key, name, description, isActive }) => ({
      key,
      name,
      description,
      isActive,
    })),
    navigation,
  }
}

export { buildAuthorizationContext }
