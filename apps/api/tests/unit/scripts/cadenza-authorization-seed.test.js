import { describe, expect, it } from 'vitest'
import { authorizationCatalog, cadenzaRolePermissions } from '../../../scripts/seed/authorization.js'

const has = (role, permission) => cadenzaRolePermissions[role].includes(permission)

describe('Cadenza authorization seed policy', () => {
  it('keeps customer permissions limited to customer workflows', () => {
    expect(has('cadenza_client', 'cadenza_customer_portal:access')).toBe(true)
    expect(has('cadenza_client', 'cadenza_lessons:read')).toBe(true)
    expect(has('cadenza_client', 'cadenza_enrollments:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_enrollments:cancel')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rentals:cancel')).toBe(true)
    expect(has('cadenza_client', 'cadenza_rentals:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_payments:create')).toBe(true)
    expect(has('cadenza_client', 'cadenza_instruments:read')).toBe(false)
    expect(has('cadenza_client', 'cadenza_rooms:read')).toBe(false)
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
    expect(authorizationCatalog.audit_logs).toEqual(['read'])
    expect(has('cadenza_frontdesk', 'audit_logs:read')).toBe(true)
  })
})
