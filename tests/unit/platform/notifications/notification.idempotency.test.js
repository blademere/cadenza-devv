import { describe, expect, it } from "vitest"

const { stableIdempotencyKey } = require("../../../../src/platform/notifications/notification.service")

describe("notification delivery idempotency", () => {
  const base = { correlationId: "corr-1", event: "application.submitted", ruleId: "rule-1", recipient: "user@example.com", templateId: "template-1" }

  it("returns the same key for the same delivery identity", () => {
    expect(stableIdempotencyKey(base)).toBe(stableIdempotencyKey({ ...base }))
  })

  it("changes when the event correlation changes", () => {
    expect(stableIdempotencyKey(base)).not.toBe(stableIdempotencyKey({ ...base, correlationId: "corr-2" }))
  })

  it("changes when the recipient changes", () => {
    expect(stableIdempotencyKey(base)).not.toBe(stableIdempotencyKey({ ...base, recipient: "other@example.com" }))
  })
})
