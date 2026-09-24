import { seedAuthorizationCatalog } from '../../authorization-core.js'

const catalog = {
  obo_authorization: ['manage'],
  obo_users: ['read', 'create', 'manage'],
  obo_clients: ['read', 'create', 'update'],
  obo_applications: ['read', 'create', 'update', 'submit', 'schedule_submission', 'receive'],
  obo_permit_types: ['read', 'create', 'update'],
  obo_forms: ['read', 'create', 'update', 'publish'],
  obo_professionals: ['read', 'create', 'update', 'review'],
  obo_appointments: ['read', 'create', 'cancel', 'check_in', 'manage'],
}

const rolePermissions = {
  client: ['obo_clients:read', 'obo_clients:create', 'obo_clients:update', 'obo_applications:read', 'obo_applications:create', 'obo_applications:update', 'obo_applications:submit', 'obo_applications:schedule_submission', 'obo_professionals:read', 'obo_appointments:read', 'obo_appointments:create', 'obo_appointments:cancel'],
  professional: ['obo_applications:read', 'obo_professionals:create', 'obo_professionals:read', 'obo_professionals:update', 'obo_appointments:read'],
  receiving_officer: ['obo_applications:read', 'obo_applications:receive', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish', 'obo_professionals:read', 'obo_professionals:review', 'obo_appointments:read', 'obo_appointments:check_in', 'obo_appointments:manage'],
  admin: ['obo_authorization:manage', 'obo_users:read', 'obo_users:create', 'obo_users:manage', 'obo_permit_types:read', 'obo_permit_types:create', 'obo_permit_types:update', 'obo_forms:read', 'obo_forms:create', 'obo_forms:update', 'obo_forms:publish', 'obo_appointments:read', 'obo_appointments:create', 'obo_appointments:cancel', 'obo_appointments:check_in', 'obo_appointments:manage'],
}

const descriptions = {
  client: 'Client who creates permit applications and schedules hardcopy submission appointments.',
  professional: 'Registered professional who applies for verification and is associated with permit applications.',
  receiving_officer: 'Receiving officer who verifies professionals, receives permit applications, and manages OBO permit/form configuration.',
  admin: 'Application administrator with OBO authorization and permit/form configuration access.',
}

async function seedOboAuthorization(prisma, application) {
  return seedAuthorizationCatalog(prisma, {
    catalog,
    application,
    roles: Object.fromEntries(Object.entries(rolePermissions).map(([name, permissions]) => [name, { permissions, description: descriptions[name] }])),
    cleanupPrefixes: ['obo_'],
  })
}

export { catalog as oboAuthorizationCatalog, rolePermissions as oboRolePermissions, seedOboAuthorization }
