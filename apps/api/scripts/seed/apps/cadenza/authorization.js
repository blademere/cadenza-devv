import { seedAuthorizationCatalog } from '../../authorization-core.js'

const catalog = {
  cadenza_authorization: ['manage'],
  cadenza_staff: ['read', 'create', 'update', 'manage'],
  cadenza_customer_portal: ['access'],
  cadenza_instructor_portal: ['access'],
  cadenza_customers: ['read', 'create', 'update', 'manage'],
  cadenza_instructors: ['read', 'read_own', 'create', 'update', 'manage'],
  cadenza_instruments: ['read', 'create', 'update', 'manage'],
  cadenza_rooms: ['read', 'create', 'update', 'manage'],
  cadenza_lessons: ['read', 'create', 'update', 'manage', 'schedule', 'attendance', 'request_reschedule', 'review_reschedule', 'complete', 'cancel'],
  cadenza_enrollments: ['read', 'create', 'update', 'manage', 'cancel'],
  cadenza_rentals: ['read', 'create', 'update', 'manage', 'cancel'],
  cadenza_payments: ['read', 'create', 'manage'],
  cadenza_dashboard: ['read'],
}

const rolePermissions = {
  cadenza_client: ['cadenza_customer_portal:access', 'cadenza_lessons:read', 'cadenza_lessons:request_reschedule', 'cadenza_enrollments:cancel', 'cadenza_rentals:cancel', 'cadenza_enrollments:read', 'cadenza_enrollments:create', 'cadenza_rentals:read', 'cadenza_rentals:create', 'cadenza_instruments:read', 'cadenza_rooms:read', 'cadenza_payments:read', 'cadenza_payments:create', 'cadenza_dashboard:read'],
  cadenza_frontdesk: ['cadenza_customers:read', 'cadenza_customers:create', 'cadenza_customers:update', 'cadenza_customers:manage', 'cadenza_staff:read', 'cadenza_staff:create', 'cadenza_staff:update', 'cadenza_staff:manage', 'cadenza_rentals:read', 'cadenza_rentals:create', 'cadenza_rentals:manage', 'cadenza_rentals:cancel', 'cadenza_instructors:read', 'cadenza_instructors:create', 'cadenza_instructors:update', 'cadenza_instructors:manage', 'cadenza_instruments:read', 'cadenza_instruments:update', 'cadenza_rooms:read', 'cadenza_rooms:update', 'cadenza_lessons:read', 'cadenza_lessons:create', 'cadenza_lessons:update', 'cadenza_lessons:manage', 'cadenza_lessons:schedule', 'cadenza_lessons:attendance', 'cadenza_lessons:request_reschedule', 'cadenza_lessons:review_reschedule', 'cadenza_lessons:complete', 'cadenza_lessons:cancel', 'cadenza_enrollments:read', 'cadenza_enrollments:update', 'cadenza_enrollments:manage', 'cadenza_enrollments:cancel', 'cadenza_rentals:read', 'cadenza_rentals:create', 'cadenza_rentals:update', 'cadenza_rentals:manage', 'cadenza_rentals:cancel', 'cadenza_payments:read', 'cadenza_payments:create', 'cadenza_payments:manage', 'cadenza_dashboard:read', 'audit_logs:read'],
  cadenza_instructor: ['cadenza_instructor_portal:access', 'cadenza_instructors:read_own', 'cadenza_lessons:read', 'cadenza_lessons:update', 'cadenza_lessons:attendance', 'cadenza_lessons:request_reschedule', 'cadenza_dashboard:read'],
  cadenza_admin: [],
}

const descriptions = {
  cadenza_client: 'Cadenza customer who browses resources, enrolls in lessons, and creates rentals.',
  cadenza_frontdesk: 'Cadenza front desk staff who manages customer, lesson, rental, and payment operations.',
  cadenza_instructor: 'Cadenza instructor who can view assigned lessons and record attendance.',
  cadenza_admin: 'Application administrator for Cadenza.',
}

async function seedCadenzaAuthorization(prisma, application) {
  const adminPermissions = [...Object.entries(catalog).flatMap(([moduleKey, actions]) => actions.map((action) => moduleKey + ':' + action)), 'audit_logs:read']
  const definitions = Object.fromEntries(Object.entries(rolePermissions).map(([name, permissions]) => [
    name,
    { permissions: name === 'cadenza_admin' ? adminPermissions : permissions, description: descriptions[name] },
  ]))
  return seedAuthorizationCatalog(prisma, {
    catalog,
    application,
    roles: definitions,
    includeAuditLogs: true,
    cleanupPrefixes: ['cadenza_'],
  })
}

export { catalog as cadenzaAuthorizationCatalog, rolePermissions as cadenzaRolePermissions, seedCadenzaAuthorization }
