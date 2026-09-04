import { describe, expect, it } from 'vitest'
import { permissions } from '../src/config/permissions'

describe('OBO Web Phase 10 permissions', () => {
  it('defines permissions required by the Plan Permit workflow', () => {
    expect(permissions.planPermits.create).toBe('planPermits.create')
    expect(permissions.planPermits.scheduleSubmission).toBe('planPermits.scheduleSubmission')
    expect(permissions.planPermits.receive).toBe('planPermits.receive')
    expect(permissions.professionals.create).toBe('professionals.create')
    expect(permissions.professionals.review).toBe('professionals.review')
  })
})
