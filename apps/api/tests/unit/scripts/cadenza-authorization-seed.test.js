import { describe, expect, it } from 'vitest'
import { cadenzaAuthorizationCatalog, cadenzaRolePermissions } from '../../../scripts/seed/apps/cadenza/authorization.js'

const has = (role, permission) => cadenzaRolePermissions[role].includes(permission)

describe('Cadenza authorization seed policy', () => {
  it('keeps customer permissions aligned with customer workflows', () => {
    expect(has('cadenza_client', 'cadenza_customer_portal:access')).toBe(true)
    expect(has('cadenza_client', 'cadenza_lessons:read')).toBe(true)
    expect(has('cadenza_client', 'cadenza_enrollments:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_enrollments:cancel')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rentals:cancel')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rentals:read')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rentals:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_instruments:read')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rooms:read')).toBe(true)
    expect(has('cadenza_client', 'cadenza_payments:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_customers:read')).toBe(false)
  })

  it('keeps instructor permissions focused on teaching workflows', () => {
    expect(has('cadenza_instructor', 'cadenza_instructor_portal:access')).toBe(true)
    expect(has('cadenza_instructor', 'cadenza_lessons:attendance')).toBe(true)
    expect(has('cadenza_instructor', 'cadenza_instructors:read_own')).toBe(true)
    expect(has('cadenza_instructor', 'cadenza_rentals:read')).toBe(false)
    expect(has('cadenza_instructor', 'cadenza_enrollments:read')).toBe(false)
  })

  it('includes audit permission in the catalog for staff roles', () => {
    expect(cadenzaAuthorizationCatalog).not.toHaveProperty('audit_logs')
    expect(cadenzaRolePermissions.cadenza_admin).toContain('audit_logs:read')
    expect(has('cadenza_frontdesk', 'audit_logs:read')).toBe(true)
  })

  it('grants the expected operational permissions to each seeded role', () => {
    expect(has('cadenza_client', 'cadenza_payments:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_lessons:schedule')).toBe(false)
    expect(has('cadenza_frontdesk', 'cadenza_enrollments:manage')).toBe(true)
    expect(has('cadenza_frontdesk', 'cadenza_payments:manage')).toBe(true)
    expect(has('cadenza_frontdesk', 'cadenza_lessons:review_reschedule')).toBe(true)
    expect(has('cadenza_instructor', 'cadenza_lessons:attendance')).toBe(true)
    expect(has('cadenza_instructor', 'cadenza_enrollments:manage')).toBe(false)
    expect(has('cadenza_admin', 'cadenza_authorization:manage')).toBe(true)
    expect(has('cadenza_admin', 'cadenza_payments:manage')).toBe(true)
    expect(has('cadenza_admin', 'cadenza_rentals:manage')).toBe(true)
  })
})
