import { describe, expect, it } from "vitest"

const { isSafeRegexPattern, validateDefinition } = require("../../src/platform/forms/form.service")
const { compare, evaluateCondition } = require("../../src/platform/rules/rule.service")


describe("platform hardening", () => {
  it("rejects unsafe regex constructs", () => {
    expect(isSafeRegexPattern("^[A-Z]+$")) .toBe(true)
    expect(isSafeRegexPattern("(a+)+$")) .toBe(false)
    expect(isSafeRegexPattern("(?=secret)")) .toBe(false)
    expect(isSafeRegexPattern("\\1")) .toBe(false)
    expect(isSafeRegexPattern("a".repeat(257))) .toBe(false)
  })

  it("rejects unsafe regex rules during form definition validation", () => {
    expect(() => validateDefinition({ fields: [{ key: "name", label: "Name", type: "text", validation: [{ operator: "regex", value: "(a+)+$" }] }] })).toThrow()
  })

  it("evaluates business rules without executable code", () => {
    expect(compare(150000, "greater_than", 100000)).toBe(true)
    expect(evaluateCondition({ all: [{ field: "amount", operator: "greater_than", value: 100000 }, { field: "type", operator: "equals", value: "COMMERCIAL" }] }, { amount: 150000, type: "COMMERCIAL" })).toBe(true)
    expect(evaluateCondition({ not: { field: "type", operator: "equals", value: "RESIDENTIAL" } }, { type: "COMMERCIAL" })).toBe(true)
  })
})
