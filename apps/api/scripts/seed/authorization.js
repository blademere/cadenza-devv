const authorizationCatalog = {
  authorization: ['manage'],
  users: ['read', 'create', 'manage'],
  applications: ['read', 'create', 'update', 'review', 'receive', 'approve', 'reject'],
  appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
  obo_authorization: ['manage'],
  obo_users: ['read', 'create', 'manage'],
  obo_clients: ['read', 'create', 'update'],
  obo_applications: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive'],
  obo_permit_types: ['read', 'create', 'update'],
  obo_forms: ['read', 'create', 'update', 'publish'],
  obo_professionals: ['read', 'create', 'update', 'review'],
  obo_appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
  cadenza_authorization: ['manage'],
  cadenza_students: ['read', 'create', 'manage'],
  cadenza_instructors: ['read', 'create', 'update', 'manage'],
  cadenza_instruments: ['read', 'create', 'update', 'manage'],
  cadenza_rooms: ['read', 'create', 'update', 'manage'],
  cadenza_lessons: ['read', 'create', 'update', 'manage', 'schedule', 'attendance', 'request_reschedule', 'review_reschedule', 'complete', 'cancel'],
  cadenza_enrollments: ['read', 'create', 'update', 'manage'],
  cadenza_rentals: ['read', 'create', 'update', 'manage'],
  cadenza_payments: ['read', 'create', 'manage'],
  cadenza_dashboard: ['read'],
}

const rolePermissions = {
  client: ['obo_clients:read', 'obo_clients:create', 'obo_clients:update', 'obo_applications:read', 'obo_applications:create', 'obo_applications:update', 'obo_applications:submit', 'obo_applications:schedule_submission', 'obo_professionals:read', 'obo_appointments:read', 'obo_appointments:create', 'obo_appointments:cancel'],
  professional: ['obo_applications:read', 'obo_professionals:create', 'obo_professionals:read', 'obo_professionals:update', 'obo_appointments:read'],
  receiving_officer: ['obo_applications:read', 'obo_applications:receive', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish', 'obo_professionals:read', 'obo_professionals:review', 'obo_appointments:read', 'obo_appointments:check_in', 'obo_appointments:manage'],
  admin: ['obo_authorization:manage', 'obo_users:read', 'obo_users:create', 'obo_users:manage', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish', 'obo_appointments:read', 'obo_appointments:create', 'obo_appointments:cancel', 'obo_appointments:check_in', 'obo_appointments:manage'],
}


const cadenzaRolePermissions = {
  cadenza_client: ['cadenza_customers:read', 'cadenza_instruments:read', 'cadenza_rooms:read', 'cadenza_lessons:read', 'cadenza_lessons:request_reschedule', 'cadenza_enrollments:read', 'cadenza_enrollments:create', 'cadenza_rentals:read', 'cadenza_customers:create', 'cadenza_payments:read', 'cadenza_payments:create', 'cadenza_dashboard:read'],
  cadenza_frontdesk: ['cadenza_customers:read', 'cadenza_customers:create', 'cadenza_customers:update', 'cadenza_customers:manage', 'cadenza_rentals:read', 'cadenza_rentals:create', 'cadenza_rentals:manage', 'cadenza_instructors:read', 'cadenza_instructors:create', 'cadenza_instructors:update', 'cadenza_instructors:manage', 'cadenza_instruments:read', 'cadenza_instruments:update', 'cadenza_rooms:read', 'cadenza_rooms:update', 'cadenza_lessons:read', 'cadenza_lessons:create', 'cadenza_lessons:update', 'cadenza_lessons:manage', 'cadenza_lessons:schedule', 'cadenza_lessons:attendance', 'cadenza_lessons:request_reschedule', 'cadenza_lessons:review_reschedule', 'cadenza_lessons:complete', 'cadenza_lessons:cancel', 'cadenza_enrollments:read', 'cadenza_enrollments:update', 'cadenza_enrollments:manage', 'cadenza_rentals:read', 'cadenza_rentals:create', 'cadenza_rentals:update', 'cadenza_rentals:manage', 'cadenza_payments:read', 'cadenza_payments:create', 'cadenza_payments:manage', 'cadenza_dashboard:read'],
  cadenza_instructor: ['cadenza_rentals:read', 'cadenza_instructors:read', 'cadenza_lessons:read', 'cadenza_lessons:update', 'cadenza_lessons:attendance', 'cadenza_lessons:request_reschedule', 'cadenza_enrollments:read', 'cadenza_dashboard:read'],
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
  for (const [roleName, keys] of Object.entries(cadenzaRolePermissions)) {
    for (const key of keys) {
      if (!permissionKeys.has(key)) {
        throw new Error(`Cadenza role '${roleName}' references permission outside the authorization catalog: ${key}`)
      }
    }
  }
}

async function seedAuthorization(prisma, { applications } = {}) {
  validateCatalog()
  const permissionRecords = new Map()
  const roles = {}
  const obo = applications?.obo ?? await prisma.app.findUnique({ where: { key: 'obo' } })
  const cadenza = applications?.cadenza ?? await prisma.app.findUnique({ where: { key: 'cadenza' } })
  if (!obo) throw new Error("Application 'obo' must be seeded before authorization roles.")
  if (!cadenza) throw new Error("Application 'cadenza' must be seeded before authorization roles.")

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

  const cadenzaDescriptions = {
    cadenza_client: 'Cadenza customer who enrolls in lessons and creates rentals.',
    cadenza_frontdesk: 'Cadenza front desk staff who manages customer, lesson, rental, and payment operations.',
    cadenza_instructor: 'Cadenza instructor who can view lesson assignments and update lesson records.',
  }
  for (const [roleName, keys] of Object.entries(cadenzaRolePermissions)) {
    const role = await prisma.role.upsert({
      where: { appId_name: { appId: cadenza.id, name: roleName } },
      update: { description: cadenzaDescriptions[roleName] },
      create: { appId: cadenza.id, name: roleName, description: cadenzaDescriptions[roleName] },
    })
    roles[roleName] = role
    for (const key of keys) {
      const permission = permissionRecords.get(key)
      if (!permission) throw new Error(`Unknown Cadenza permission declared for ${roleName}: ${key}`)
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }
  }

  const cadenzaAdmin = await prisma.role.upsert({ where: { appId_name: { appId: cadenza.id, name: 'admin' } }, update: { description: 'Application administrator for Cadenza.' }, create: { appId: cadenza.id, name: 'admin', description: 'Application administrator for Cadenza.' } })
  roles.cadenza_admin = cadenzaAdmin
  for (const [key, permission] of permissionRecords) {
    if (!key.startsWith('cadenza_')) continue
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: cadenzaAdmin.id, permissionId: permission.id } }, update: {}, create: { roleId: cadenzaAdmin.id, permissionId: permission.id } })
  }

  return { roles, permissionRecords }
}

export { authorizationCatalog, rolePermissions, cadenzaRolePermissions, seedAuthorization }
