const { describe, expect, it } = require("vitest")
const { evaluateCondition, validateFieldValue, validateDefinition } = require("../../src/platform/forms/form.service")

describe("dynamic form validation", () => {
  it("evaluates nested all/any visibility conditions", () => {
    const condition = {
      all: [
        { field: "scope", operator: "equals", value: "RENOVATION" },
        { any: [
          { field: "occupancy", operator: "equals", value: "COMMERCIAL" },
          { field: "occupancy", operator: "equals", value: "ASSEMBLY" },
        ] },
      ],
    }

    expect(evaluateCondition(condition, { scope: "RENOVATION", occupancy: "COMMERCIAL" })).toBe(true)
    expect(evaluateCondition(condition, { scope: "NEW", occupancy: "COMMERCIAL" })).toBe(false)
  })

  it("supports conditional required fields and declarative rules", () => {
    const field = {
      key: "renovation_details",
      label: "Renovation details",
      type: "text",
      required: true,
      visibility: { field: "scope", operator: "equals", value: "RENOVATION" },
      validation: [{ operator: "min_length", value: 10 }],
      options: [],
    }

    expect(validateFieldValue(field, undefined, { scope: "NEW" })).toEqual([])
    expect(validateFieldValue(field, undefined, { scope: "RENOVATION" })[0].code).toBe("REQUIRED")
    expect(validateFieldValue(field, "short", { scope: "RENOVATION" })[0].code).toBe("VALIDATION")
    expect(validateFieldValue(field, "long enough", { scope: "RENOVATION" })).toEqual([])
  })

  it("supports cross-field equality rules", () => {
    const field = {
      key: "confirm_email",
      label: "Confirm email",
      type: "email",
      required: true,
      validation: [{ operator: "matches_field", otherField: "email" }],
      options: [],
    }

    expect(validateFieldValue(field, "a@example.com", { email: "a@example.com" })).toEqual([])
    expect(validateFieldValue(field, "b@example.com", { email: "a@example.com" })[0].code).toBe("VALIDATION")
  })

  it("rejects duplicate fields and unsupported field types", () => {
    expect(() => validateDefinition({ fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "name", label: "Other", type: "text" },
    ] })).toThrow(/Duplicate form field key/)

    expect(() => validateDefinition({ fields: [
      { key: "name", label: "Name", type: "script" },
    ] })).toThrow(/Unsupported field type/)
  })
})
