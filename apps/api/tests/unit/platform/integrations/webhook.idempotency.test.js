import { describe, expect, it } from "vitest"

const { makeIdempotencyKey } = require("../../../../src/platform/integrations/webhook.service")

describe("webhook delivery idempotency", () => {
  const base = { endpointId: "endpoint-1", event: "application.submitted", entityType: "Application", entityId: "42", correlationId: "corr-1" }

  it("is deterministic for the same delivery identity", () => {
    expect(makeIdempotencyKey(base)).toBe(makeIdempotencyKey({ ...base }))
  })

  it("changes when correlation changes", () => {
    expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, correlationId: "corr-2" }))
  })

  it("changes when endpoint changes", () => {
    expect(makeIdempotencyKey(base)).not.toBe(makeIdempotencyKey({ ...base, endpointId: "endpoint-2" }))
  })
})
