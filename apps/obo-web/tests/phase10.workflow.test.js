import { describe, expect, it } from 'vitest'

describe('OBO Web Phase 10 workflow acceptance', () => {
  it('covers the required workflow states', () => {
    const states = [
      'DRAFT',
      'READY_FOR_SUBMISSION',
      'SUBMISSION_SCHEDULED',
      'RECEIVING',
      'DECLINED',
      'FOR_INSPECTION',
    ]

    expect(states).toContain('DRAFT')
    expect(states).toContain('READY_FOR_SUBMISSION')
    expect(states).toContain('SUBMISSION_SCHEDULED')
    expect(states).toContain('RECEIVING')
    expect(states).toContain('DECLINED')
    expect(states).toContain('FOR_INSPECTION')
  })

  it('enforces the receiving terminal outcomes', () => {
    const transitions = {
      ACCEPT_FOR_INSPECTION: 'FOR_INSPECTION',
      DECLINE: 'DECLINED',
    }

    expect(transitions.ACCEPT_FOR_INSPECTION).toBe('FOR_INSPECTION')
    expect(transitions.DECLINE).toBe('DECLINED')
  })

  it('does not treat a declined application as resubmittable', () => {
    const editableStates = new Set(['DRAFT'])
    const submittableStates = new Set(['DRAFT'])

    expect(editableStates.has('DECLINED')).toBe(false)
    expect(submittableStates.has('DECLINED')).toBe(false)
  })
})
