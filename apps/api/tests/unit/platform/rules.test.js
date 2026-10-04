import { describe, expect, it } from 'vitest'
const { validateCondition, validateAction, validateRuleDefinition, evaluateCondition, compare } = await import('../../../src/platform/rules/rule.service.js')

describe('business rules capability', () => {
  it('accepts nested all/any/not conditions', () => expect(() => validateCondition({ all: [{ field: 'amount', operator: 'greater_than', value: 1000 }, { any: [{ field: 'department', operator: 'equals', value: 'FINANCE' }, { not: { field: 'status', operator: 'equals', value: 'DRAFT' } }] }] })).not.toThrow())
  it('rejects unknown operators and empty groups', () => { expect(() => validateCondition({ field: 'amount', operator: 'between', value: [1, 2] })).toThrow(); expect(() => validateCondition({ all: [] })).toThrow() })
  it('rejects ambiguous value and valueFrom conditions', () => expect(() => validateCondition({ field: 'amount', operator: 'greater_than', value: 10, valueFrom: 'limit' })).toThrow())
  it('rejects unsupported or incomplete actions', () => { expect(() => validateAction({ type: 'RUN_CODE', code: 'return true' })).toThrow(); expect(() => validateAction({ type: 'START_APPROVAL' })).toThrow(); expect(() => validateAction({ type: 'START_APPROVAL', policyKey: 'finance-review' })).not.toThrow() })
  it('validates and evaluates a safe rule definition', () => { expect(() => validateRuleDefinition({ event: 'application.submitted', conditions: { field: 'amount', operator: 'greater_than', value: 100 }, actions: [{ type: 'START_APPROVAL', policyKey: 'manager-review' }] })).not.toThrow(); expect(evaluateCondition({ field: 'amount', operator: 'greater_than', value: 100 }, { amount: 101 })).toBe(true) })
  it('rejects unsupported regex-like rule execution through the form boundary', () => { expect(compare(150000, 'greater_than', 100000)).toBe(true); expect(evaluateCondition({ all: [{ field: 'amount', operator: 'greater_than', value: 100000 }, { field: 'type', operator: 'equals', value: 'COMMERCIAL' }] }, { amount: 150000, type: 'COMMERCIAL' })).toBe(true); expect(evaluateCondition({ not: { field: 'type', operator: 'equals', value: 'RESIDENTIAL' } }, { type: 'COMMERCIAL' })).toBe(true) })
})
