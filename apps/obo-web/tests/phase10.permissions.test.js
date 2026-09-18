import { describe, expect, it } from 'vitest'
import { permissions } from '../src/config/permissions'

describe('OBO Web Phase 10 permissions', () => {
  it('defines the backend permissions required by the Application workflow', () => {
    expect(permissions.applications.create).toBe('obo_applications:create')
    expect(permissions.applications.scheduleSubmission).toBe('obo_applications:schedule_submission')
    expect(permissions.applications.receive).toBe('obo_applications:receive')
    expect(permissions.professionals.create).toBe('obo_professionals:create')
    expect(permissions.professionals.review).toBe('obo_professionals:review')
  })
})
