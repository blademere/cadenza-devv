const authorizationCatalog = {
  authorization: ['manage'],
  users: ['read', 'create', 'manage'],
  applications: ['read', 'create', 'update', 'review', 'receive', 'approve', 'reject'],
  appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
  obo_authorization: ['manage'],
  obo_users: ['read', 'create', 'manage'],
  obo_clients: ['read', 'create', 'update'],
  obo_plan_permits: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive'],
  obo_permit_types: ['read', 'create', 'update'],
  obo_forms: ['read', 'create', 'update', 'publish'],
  obo_professionals: ['read', 'create', 'update', 'review'],
  obo_appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
}

const rolePermissions = {
  client: ['applications:read', 'applications:create', 'applications:update', 'appointments:read', 'appointments:create', 'appointments:cancel', 'obo_clients:read', 'obo_clients:create', 'obo_clients:update', 'obo_plan_permits:read', 'obo_plan_permits:create', 'obo_plan_permits:update', 'obo_plan_permits:submit', 'obo_plan_permits:schedule_submission', 'obo_professionals:read'],
  professional: ['applications:read', 'applications:create', 'applications:update', 'appointments:read', 'obo_plan_permits:read', 'obo_professionals:create', 'obo_professionals:read', 'obo_professionals:update'],
  receiving_officer: ['applications:read', 'applications:review', 'applications:receive', 'applications:approve', 'applications:reject', 'appointments:read', 'appointments:check_in', 'appointments:manage', 'obo_plan_permits:read', 'obo_plan_permits:receive', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish', 'obo_professionals:read', 'obo_professionals:review'],
  admin: ['authorization:manage', 'users:read', 'users:create', 'users:manage', 'obo_authorization:manage', 'obo_users:read', 'obo_users:create', 'obo_users:manage', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish'],
}

const moduleName = (key) => key.split(/[_-]+/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')

function validateCatalog() {
  const permissionKeys = new Set(Object.entries(authorizationCatalog).flatMap(([moduleKey, actions]) => actions.map((action) => `${moduleKey}:${action}`)))
  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    for (const key of keys) {
      if (!permissionKeys.has(key)) {
        throw new Error(`OBO role '${roleName}' references permission outside the authorization catalog: ${key}`)
      }
    }
  }
}

async function seedAuthorization(prisma, { applications } = {}) {
  validateCatalog()
  const permissionRecords = new Map()
  const roles = {}
  const obo = applications?.obo ?? await prisma.app.findUnique({ where: { key: 'obo' } })
  if (!obo) throw new Error("Application 'obo' must be seeded before authorization roles.")

  for (const [moduleKey, actions] of Object.entries(authorizationCatalog)) {
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

  const descriptions = {
    client: 'Client who creates permit applications and schedules hardcopy submission appointments.',
    professional: 'Registered professional who applies for verification and is associated with permit applications.',
    receiving_officer: 'Receiving officer who verifies professionals, receives permit applications, and manages OBO permit/form configuration.',
    admin: 'Application administrator with OBO authorization and permit/form configuration access.',
  }

  for (const roleName of Object.keys(rolePermissions)) {
    roles[roleName] = await prisma.role.upsert({
      where: { appId_name: { appId: obo.id, name: roleName } },
      update: { description: descriptions[roleName] },
      create: { appId: obo.id, name: roleName, description: descriptions[roleName] },
    })
  }

  for (const [roleName, keys] of Object.entries(rolePermissions)) {
    const role = roles[roleName]
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permission: { module: { key: { not: { startsWith: 'obo_' } } } },
      },
    })
    for (const key of keys) {
      const permission = permissionRecords.get(key)
      if (!permission) throw new Error(`Unknown permission declared for ${roleName}: ${key}`)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  return { roles, permissionRecords }
}

export { authorizationCatalog, rolePermissions, seedAuthorization }
