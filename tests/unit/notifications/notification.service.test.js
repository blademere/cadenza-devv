import { describe, expect, it } from "vitest"

const { normalizeChannels } = await import("../../../src/features/notifications/notification.service.js")

describe("notification service", () => {
  it("defaults to in-app delivery", () => {
    expect(normalizeChannels()).toEqual(["IN_APP"])
  })

  it("normalizes and deduplicates channels", () => {
    expect(normalizeChannels(["email", "EMAIL", "sms"])).toEqual(["EMAIL", "SMS"])
  })

  it("rejects unsupported channels", () => {
    expect(() => normalizeChannels(["PUSH"])).toThrow("Unsupported notification channel 'PUSH'.")
  })
})
