import { describe, expect, it } from 'vitest'
const { compare, evaluateCondition } = require('../../src/platform/rules/rule.service')
const { render } = require('../../src/platform/notifications/notification.service')

describe('business rule evaluator', () => {
  it('evaluates scalar and compound conditions', () => {
    expect(compare(150000, 'greater_than', 100000)).toBe(true)
    expect(evaluateCondition({ all: [
      { field: 'department', operator: 'equals', value: 'Finance' },
      { field: 'amount', operator: 'greater_than', value: 100000 },
    ] }, { department: 'Finance', amount: 150000 })).toBe(true)
    expect(evaluateCondition({ any: [
      { field: 'risk', operator: 'equals', value: 'HIGH' },
      { field: 'amount', operator: 'greater_than', value: 1000000 },
    ] }, { risk: 'LOW', amount: 2000000 })).toBe(true)
  })
})

describe('notification templates', () => {
  it('renders nested context variables', () => {
    expect(render('Hello {{ user.name }}, application {{ application.number }}', {
      user: { name: 'Juan' },
      application: { number: 'BP-1001' },
    })).toBe('Hello Juan, application BP-1001')
  })
})
