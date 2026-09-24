const moduleName = (key) => key.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

async function seedAuthorizationCatalog(prisma, { catalog, application, roles: roleDefinitions, includeAuditLogs = false, cleanupPrefixes = [] }) {
  if (!application?.id) throw new Error('Application must be seeded before authorization.')

  const permissionRecords = new Map()
  const roles = {}

  const selectedCatalog = { ...catalog }
  if (includeAuditLogs) selectedCatalog.audit_logs = ['read']

  for (const [moduleKey, actions] of Object.entries(selectedCatalog)) {
    const module = await prisma.module.upsert({
      where: { key: moduleKey },
      update: { name: moduleName(moduleKey), isActive: true },
      create: { key: moduleKey, name: moduleName(moduleKey), isActive: true },
    })
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { moduleId_action: { moduleId: module.id, action } },
        update: {},
        create: { moduleId: module.id, action },
      })
      permissionRecords.set(`${moduleKey}:${action}`, permission)
    }
  }

  const validPermissions = new Set(permissionRecords.keys())
  for (const [roleName, definition] of Object.entries(roleDefinitions)) {
    for (const key of definition.permissions) {
      if (!validPermissions.has(key)) {
        throw new Error(`Role '${roleName}' references unknown permission: ${key}`)
      }
    }

    const role = await prisma.role.upsert({
      where: { appId_name: { appId: application.id, name: roleName } },
      update: { description: definition.description },
      create: { appId: application.id, name: roleName, description: definition.description },
    })
    roles[roleName] = role

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permission: {
          module: {
            OR: [
              ...cleanupPrefixes.map((prefix) => ({ key: { startsWith: prefix } })),
              ...(includeAuditLogs ? [{ key: 'audit_logs' }] : []),
            ],
          },
        },
      },
    })

    for (const key of definition.permissions) {
      const permission = permissionRecords.get(key)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  return { roles, permissionRecords }
}

export { seedAuthorizationCatalog }
