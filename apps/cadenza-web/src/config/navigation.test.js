import { describe, expect, it } from 'vitest'
import { navigation, normalizeNavigation } from '../../../src/config/navigation'

const sectionKeys = (permissions) =>
  normalizeNavigation(navigation, permissions).map((section) => ({
    key: section.key,
    items: section.items.map((item) => item.key),
  }))

describe('Cadenza navigation authorization', () => {
  it('shows customer workflows without management sections', () => {
    const visible = sectionKeys([
      'cadenza_dashboard:read',
      'cadenza_lessons:read',
      'cadenza_enrollments:read',
      'cadenza_enrollments:create',
      'cadenza_rentals:read',
      'cadenza_rentals:create',
      'cadenza_payments:read',
      'cadenza_payments:create',
    ])

    expect(visible.map((section) => section.key)).toEqual(['workspace', 'customer'])
    expect(visible.find((section) => section.key === 'customer')?.items).toEqual(['lessons', 'rentals'])
  })

  it('shows instructor workspace without customer or operations sections', () => {
    const visible = sectionKeys([
      'cadenza_dashboard:read',
      'cadenza_instructors:read_own',
      'cadenza_lessons:read',
      'cadenza_lessons:attendance',
      'cadenza_lessons:request_reschedule',
    ])

    expect(visible.map((section) => section.key)).toEqual(['workspace', 'instructor'])
  })

  it('shows operational sections only when management capabilities exist', () => {
    const visible = sectionKeys([
      'cadenza_dashboard:read',
      'cadenza_lessons:create',
      'cadenza_lessons:manage',
      'cadenza_lessons:schedule',
      'cadenza_rentals:manage',
      'cadenza_instruments:update',
      'cadenza_rooms:update',
      'cadenza_customers:manage',
      'audit_logs:read',
    ])

    expect(visible.map((section) => section.key)).toEqual([
      'workspace',
      'lessons-management',
      'rentals-management',
      'resources',
      'administration',
    ])
  })
})
