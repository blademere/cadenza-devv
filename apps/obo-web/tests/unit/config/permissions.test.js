import { describe, expect, it } from 'vitest'
import { permissionList, permissions } from '../../../src/config/permissions.js'

describe('OBO permission configuration', () => {
  it('exposes the expected permission vocabulary', () => {
    expect(permissions.planPermits).toEqual({
      read: 'obo_plan_permits:read',
      create: 'obo_plan_permits:create',
      update: 'obo_plan_permits:update',
      submit: 'obo_plan_permits:submit',
      scheduleSubmission: 'obo_plan_permits:schedule_submission',
      receive: 'obo_plan_permits:receive',
      inspect: 'obo_plan_permits:inspect',
    })

    expect(permissions.permitTypes).toEqual({
      read: 'obo_permit_types:read',
      create: 'obo_permit_types:create',
      update: 'obo_permit_types:update',
    })

    expect(permissions.forms).toEqual({
      read: 'obo_forms:read',
      create: 'obo_forms:create',
      update: 'obo_forms:update',
      publish: 'obo_forms:publish',
    })

    expect(permissions.appointments).toEqual({
      read: 'appointments:read',
      create: 'appointments:create',
      manage: 'appointments:manage',
      cancel: 'appointments:cancel',
    })

    expect(permissions.professionals).toEqual({
      read: 'obo_professionals:read',
      create: 'obo_professionals:create',
      review: 'obo_professionals:review',
    })

    expect(permissions.users.manage).toBe('users:manage')
    expect(permissions.authorization.manage).toBe('authorization:manage')
  })

  it('contains each permission exactly once', () => {
    expect(new Set(permissionList).size).toBe(permissionList.length)
    expect(permissionList).toContain(permissions.planPermits.receive)
    expect(permissionList).toContain(permissions.permitTypes.create)
    expect(permissionList).toContain(permissions.forms.publish)
    expect(permissionList).toContain(permissions.professionals.review)
    expect(permissionList).toContain(permissions.users.manage)
    expect(permissionList).toContain(permissions.authorization.manage)
    expect(permissionList).toContain(permissions.appointments.manage)
  })
})
