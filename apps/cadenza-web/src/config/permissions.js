/**
 * Frontend permission keys for the Cadenza application.
 *
 * These values mirror the permission keys issued by the API authorization
 * catalog. The backend remains the source of truth; this module only avoids
 * scattering string literals through the Cadenza Web UI.
 */
export const PERMISSIONS = Object.freeze({
  authorization: Object.freeze({
    manage: 'cadenza_authorization:manage',
  }),
  customers: Object.freeze({
    read: 'cadenza_customers:read',
    create: 'cadenza_customers:create',
    update: 'cadenza_customers:update',
    manage: 'cadenza_customers:manage',
  }),
  staff: Object.freeze({ read: 'cadenza_staff:read', create: 'cadenza_staff:create', update: 'cadenza_staff:update', manage: 'cadenza_staff:manage' }),
  instructors: Object.freeze({
    read: 'cadenza_instructors:read',
    readOwn: 'cadenza_instructors:read_own',
    create: 'cadenza_instructors:create',
    update: 'cadenza_instructors:update',
    manage: 'cadenza_instructors:manage',
  }),
  instruments: Object.freeze({
    read: 'cadenza_instruments:read',
    create: 'cadenza_instruments:create',
    update: 'cadenza_instruments:update',
    manage: 'cadenza_instruments:manage',
  }),
  rooms: Object.freeze({
    read: 'cadenza_rooms:read',
    create: 'cadenza_rooms:create',
    update: 'cadenza_rooms:update',
    manage: 'cadenza_rooms:manage',
  }),
  lessons: Object.freeze({
    read: 'cadenza_lessons:read',
    create: 'cadenza_lessons:create',
    update: 'cadenza_lessons:update',
    manage: 'cadenza_lessons:manage',
    schedule: 'cadenza_lessons:schedule',
    attendance: 'cadenza_lessons:attendance',
    requestReschedule: 'cadenza_lessons:request_reschedule',
    reviewReschedule: 'cadenza_lessons:review_reschedule',
    complete: 'cadenza_lessons:complete',
    cancel: 'cadenza_lessons:cancel',
  }),
  enrollments: Object.freeze({
    read: 'cadenza_enrollments:read',
    create: 'cadenza_enrollments:create',
    update: 'cadenza_enrollments:update',
    manage: 'cadenza_enrollments:manage',
    cancel: 'cadenza_enrollments:cancel',
  }),
  rentals: Object.freeze({
    read: 'cadenza_rentals:read',
    create: 'cadenza_rentals:create',
    update: 'cadenza_rentals:update',
    manage: 'cadenza_rentals:manage',
    cancel: 'cadenza_rentals:cancel',
  }),
  dashboard: Object.freeze({ read: 'cadenza_dashboard:read' }),
  portals: Object.freeze({
    customer: 'cadenza_customer_portal:access',
    instructor: 'cadenza_instructor_portal:access',
  }),
  audit: Object.freeze({ read: 'audit_logs:read' }),
  payments: Object.freeze({
    read: 'cadenza_payments:read',
    create: 'cadenza_payments:create',
    manage: 'cadenza_payments:manage',
  }),
})

export const hasPermission = (permissions, permission) =>
  Array.isArray(permissions) && Boolean(permission) && permissions.includes(permission)
