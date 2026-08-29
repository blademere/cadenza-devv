import { describe, expect, it } from "vitest"

const { validateDefinition, evaluateCondition } = require("../../../../src/platform/forms/form.service")

describe("dynamic form definition hardening", () => {
  const base = {
    fields: [
      { key: "amount", label: "Amount", type: "number" },
      { key: "type", label: "Type", type: "select", options: [{ value: "A", label: "A" }] },
    ],
  }

  it("rejects invalid field keys", () => {
    expect(() => validateDefinition({ fields: [{ key: "1amount", label: "Amount", type: "number" }] })).toThrow()
  })

  it("rejects unknown visibility fields", () => {
    expect(() => validateDefinition({ ...base, fields: [{ ...base.fields[0], visibility: { field: "missing", operator: "equals", value: true } }, base.fields[1]] })).toThrow()
  })

  it("rejects invalid logical conditions", () => {
    expect(() => validateDefinition({ ...base, fields: [{ ...base.fields[0], visibility: { all: [], any: [] } }, base.fields[1]] })).toThrow()
  })

  it("rejects duplicate select options", () => {
    expect(() => validateDefinition({ fields: [{ key: "type", label: "Type", type: "select", options: [{ value: "A", label: "A" }, { value: "A", label: "Again" }] }] })).toThrow()
  })

  it("rejects matches_field references to unknown fields", () => {
    expect(() => validateDefinition({ fields: [{ key: "amount", label: "Amount", type: "number", validation: [{ operator: "matches_field", otherField: "missing" }] }] })).toThrow()
  })

  it("evaluates bounded nested conditions", () => {
    expect(evaluateCondition({ all: [{ field: "amount", operator: "min", value: 100 }, { not: { field: "type", operator: "equals", value: "B" } }] }, { amount: 150, type: "A" })).toBe(true)
  })
})
