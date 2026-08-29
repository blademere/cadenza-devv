import { describe, expect, it, vi } from "vitest"

vi.mock("../../../../src/infrastructure/database/prisma", () => ({ businessRule: { findMany: vi.fn(), create: vi.fn() } }))
vi.mock("../../../../src/platform/audit/audit.service", () => ({ recordAudit: vi.fn() }))

const { validateCondition, validateAction, validateRuleDefinition, evaluateCondition } = require("../../../../src/platform/rules/rule.service")

describe("business rule configuration validation", () => {
  it("accepts nested all/any/not conditions", () => {
    expect(() => validateCondition({
      all: [
        { field: "amount", operator: "greater_than", value: 1000 },
        { any: [
          { field: "department", operator: "equals", value: "FINANCE" },
          { not: { field: "status", operator: "equals", value: "DRAFT" } },
        ] },
      ],
    })).not.toThrow()
  })

  it("rejects unknown operators and empty groups", () => {
    expect(() => validateCondition({ field: "amount", operator: "between", value: [1, 2] })).toThrow()
    expect(() => validateCondition({ all: [] })).toThrow()
  })

  it("rejects ambiguous value and valueFrom conditions", () => {
    expect(() => validateCondition({ field: "amount", operator: "greater_than", value: 10, valueFrom: "limit" })).toThrow()
  })

  it("rejects unsupported or incomplete actions", () => {
    expect(() => validateAction({ type: "RUN_CODE", code: "return true" })).toThrow()
    expect(() => validateAction({ type: "START_APPROVAL" })).toThrow()
    expect(() => validateAction({ type: "START_APPROVAL", policyKey: "finance-review" })).not.toThrow()
  })

  it("validates and evaluates a safe rule definition", () => {
    expect(() => validateRuleDefinition({
      event: "application.submitted",
      conditions: { field: "amount", operator: "greater_than", value: 100 },
      actions: [{ type: "START_APPROVAL", policyKey: "manager-review" }],
    })).not.toThrow()
    expect(evaluateCondition({ field: "amount", operator: "greater_than", value: 100 }, { amount: 101 })).toBe(true)
  })
})
