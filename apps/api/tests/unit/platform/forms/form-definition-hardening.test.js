import { describe, expect, it } from "vitest"

const { validateDefinition, validateFieldValue, evaluateCondition } = require("../../../../src/platform/forms/form.service")

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

  it("accepts generic reference fields without resolving a domain entity", () => {
    expect(() => validateDefinition({
      fields: [{ key: "owner", label: "Owner", type: "reference", required: true, config: { referenceType: "external_record", multiple: false } }],
    })).not.toThrow()
  })

  it("accepts multiple generic references and keeps their identifiers opaque", () => {
    const field = { key: "relatedRecords", label: "Related records", type: "reference", config: { referenceType: "external_record", multiple: true } }
    expect(() => validateDefinition({ fields: [field] })).not.toThrow()
    expect(validateFieldValue(field, ["record-1", "record-2"])).toEqual([])
  })

  it("accepts different reference domains through the same generic capability", () => {
    expect(() => validateDefinition({
      fields: [
        { key: "customer", label: "Customer", type: "reference", config: { referenceType: "customer", multiple: false } },
        { key: "asset", label: "Asset", type: "reference", config: { referenceType: "asset", multiple: true } },
      ],
    })).not.toThrow()
  })

  it("rejects reference fields without a valid generic referenceType", () => {
    expect(() => validateDefinition({ fields: [{ key: "owner", label: "Owner", type: "reference", config: { multiple: false } }] })).toThrow()
    expect(() => validateDefinition({ fields: [{ key: "owner", label: "Owner", type: "reference", config: { referenceType: "", multiple: false } }] })).toThrow()
    expect(() => validateDefinition({ fields: [{ key: "owner", label: "Owner", type: "reference", config: { referenceType: "123invalid", multiple: false } }] })).toThrow()
  })

  it("rejects invalid multiple configuration", () => {
    expect(() => validateDefinition({
      fields: [{ key: "owner", label: "Owner", type: "reference", config: { referenceType: "external_record", multiple: "true" } }],
    })).toThrow()
  })

  it("rejects a single reference when multiple is enabled", () => {
    const field = { key: "records", label: "Records", type: "reference", config: { referenceType: "external_record", multiple: true } }
    expect(validateFieldValue(field, "record-1")[0].code).toBe("TYPE")
  })

  it("rejects duplicate or empty reference identifiers", () => {
    const field = { key: "records", label: "Records", type: "reference", config: { referenceType: "external_record", multiple: true } }
    expect(validateFieldValue(field, ["record-1", "record-1"])[0].code).toBe("REFERENCE")
    expect(validateFieldValue(field, ["record-1", ""])[0].code).toBe("REFERENCE")
  })

  it("evaluates bounded nested conditions", () => {
    expect(evaluateCondition({ all: [{ field: "amount", operator: "min", value: 100 }, { not: { field: "type", operator: "equals", value: "B" } }] }, { amount: 150, type: "A" })).toBe(true)
  })
})
