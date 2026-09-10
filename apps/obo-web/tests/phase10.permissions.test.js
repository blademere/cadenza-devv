import { describe, expect, it } from 'vitest'
import { permissions } from '../src/config/permissions'

describe('OBO Web Phase 10 permissions', () => {
  it('defines the backend permissions required by the Plan Permit workflow', () => {
    expect(permissions.planPermits.create).toBe('obo_plan_permits:create')
    expect(permissions.planPermits.scheduleSubmission).toBe('obo_plan_permits:schedule_submission')
    expect(permissions.planPermits.receive).toBe('obo_plan_permits:receive')
    expect(permissions.professionals.create).toBe('obo_professionals:create')
    expect(permissions.professionals.review).toBe('obo_professionals:review')
  })
})
