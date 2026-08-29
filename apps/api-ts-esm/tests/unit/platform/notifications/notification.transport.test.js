import { beforeEach, describe, expect, it } from "vitest"

const {
  registerNotificationTransport,
  unregisterNotificationTransport,
  getNotificationTransport,
  clearNotificationTransports,
} = await import("../../../../src/platform/notifications/notification.transport.js")

describe("notification transport registry", () => {
  beforeEach(() => clearNotificationTransports())

  it("registers transports by normalized channel", () => {
    const transport = { send: async () => undefined }
    registerNotificationTransport("email", transport)
    expect(getNotificationTransport("EMAIL")).toBe(transport)
  })

  it("rejects transports without send", () => {
    expect(() => registerNotificationTransport("EMAIL", {})).toThrow("must implement send")
  })

  it("supports unregistering and clearing transports", () => {
    const transport = { send: async () => undefined }
    registerNotificationTransport("EMAIL", transport)
    unregisterNotificationTransport("EMAIL")
    expect(getNotificationTransport("EMAIL")).toBeNull()

    registerNotificationTransport("SMS", transport)
    clearNotificationTransports()
    expect(getNotificationTransport("SMS")).toBeNull()
  })
})
