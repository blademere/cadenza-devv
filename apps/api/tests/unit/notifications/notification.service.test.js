import { describe, expect, it } from "vitest"

const { normalizeChannels } = await import("../../../src/platform/notifications/notification.send.service.js")

describe("platform notification sending", () => {
  it("defaults to in-app delivery", () => {
    expect(normalizeChannels()).toEqual(["IN_APP"])
  })

  it("normalizes and deduplicates channels", () => {
    expect(normalizeChannels(["email", "EMAIL", "sms"])).toEqual(["EMAIL", "SMS"])
  })

  it("accepts supported platform channels", () => {
    expect(normalizeChannels(["push", "webhook"])).toEqual(["PUSH", "WEBHOOK"])
  })

  it("rejects unsupported channels", () => {
    expect(() => normalizeChannels(["FAX"])).toThrow("Unsupported notification channel 'FAX'.")
  })
})
