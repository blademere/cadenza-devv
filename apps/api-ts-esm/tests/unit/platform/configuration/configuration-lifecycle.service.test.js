import { describe, expect, it } from "vitest"

const {
  CONFIGURATION_STATUS,
  assertTransition,
  assertMutable,
  assertPublishable,
  assertRollbackTarget,
} = require("../../../../src/platform/configuration/configuration-lifecycle.service")

describe("configuration lifecycle hardening", () => {
  it("allows only the intended forward lifecycle", () => {
    expect(() => assertTransition("DRAFT", "VALIDATED")).not.toThrow()
    expect(() => assertTransition("VALIDATED", "PUBLISHED")).not.toThrow()
    expect(() => assertTransition("PUBLISHED", "ARCHIVED")).not.toThrow()
  })

  it("rejects skipping validation", () => {
    expect(() => assertTransition("DRAFT", "PUBLISHED")).toThrow()
  })

  it("rejects publishing a draft directly", () => {
    expect(() => assertPublishable("DRAFT")).toThrow()
    expect(() => assertPublishable("VALIDATED")).not.toThrow()
  })

  it("allows validated configurations to be returned to draft", () => {
    expect(() => assertTransition("VALIDATED", "DRAFT")).not.toThrow()
  })

  it("treats published and archived content as immutable", () => {
    expect(() => assertMutable(CONFIGURATION_STATUS.PUBLISHED)).toThrow()
    expect(() => assertMutable(CONFIGURATION_STATUS.ARCHIVED)).toThrow()
    expect(() => assertMutable(CONFIGURATION_STATUS.DRAFT)).not.toThrow()
    expect(() => assertMutable(CONFIGURATION_STATUS.VALIDATED)).not.toThrow()
  })

  it("only permits archived versions as rollback targets", () => {
    expect(() => assertRollbackTarget("ARCHIVED")).not.toThrow()
    expect(() => assertRollbackTarget("PUBLISHED")).toThrow()
    expect(() => assertRollbackTarget("DRAFT")).toThrow()
  })

  it("rejects unknown states", () => {
    expect(() => assertTransition("DRAFT", "BROKEN")).toThrow()
    expect(() => assertMutable("BROKEN")).toThrow()
  })
})
