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
  students: Object.freeze({
    read: 'cadenza_students:read',
    create: 'cadenza_students:create',
    manage: 'cadenza_students:manage',
  }),
  instructors: Object.freeze({
    read: 'cadenza_instructors:read',
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
  }),
  rentals: Object.freeze({
    read: 'cadenza_rentals:read',
    create: 'cadenza_rentals:create',
    update: 'cadenza_rentals:update',
    manage: 'cadenza_rentals:manage',
  }),
  payments: Object.freeze({
    read: 'cadenza_payments:read',
    create: 'cadenza_payments:create',
    manage: 'cadenza_payments:manage',
  }),
})

export const hasPermission = (permissions, permission) =>
  Array.isArray(permissions) && Boolean(permission) && permissions.includes(permission)
