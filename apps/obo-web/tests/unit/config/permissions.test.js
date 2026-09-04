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

    expect(permissions.appointments).toEqual({
      read: 'appointments:read',
      create: 'appointments:create',
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
    expect(permissionList).toContain(permissions.professionals.review)
    expect(permissionList).toContain(permissions.users.manage)
    expect(permissionList).toContain(permissions.authorization.manage)
  })
})
