import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  notificationDelivery: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
  notificationRule: { findMany: vi.fn() },
  notificationTemplate: { findUnique: vi.fn(), create: vi.fn() },
  user: { findMany: vi.fn() },
}))
vi.mock("../../../../src/infrastructure/database/prisma", () => mocks)
vi.mock("../../../../src/platform/rules/rule.service", () => ({
  evaluateCondition: vi.fn(() => true),
  getPathValue: vi.fn((obj, key) => key?.split(".").reduce((v, k) => v?.[k], obj)),
}))
vi.mock("../../../../src/platform/audit/audit.service", () => ({ recordAudit: vi.fn() }))

const prisma = require("../../../../src/infrastructure/database/prisma")
const { claimDelivery, markDeliveryFailed, markDeliverySent, computeRetryAt, stableIdempotencyKey, MAX_ATTEMPTS } = require("../../../../src/platform/notifications/notification.service")

describe("notification delivery hardening", () => {
  beforeEach(() => {
    for (const group of Object.values(mocks)) for (const mock of Object.values(group)) mock.mockReset()
  })

  it("claims a queued delivery with optimistic concurrency protection", async () => {
    const updatedAt = new Date("2026-08-17T07:00:00.000Z")
    const delivery = { id: "d1", status: "QUEUED", updatedAt }
    prisma.notificationDelivery.findUnique.mockResolvedValueOnce(delivery).mockResolvedValueOnce({ ...delivery, status: "PROCESSING" })
    prisma.notificationDelivery.updateMany.mockResolvedValue({ count: 1 })
    const result = await claimDelivery({ id: "d1", now: new Date("2026-08-17T07:01:00.000Z") })
    expect(result.claimed).toBe(true)
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "d1", status: "QUEUED", updatedAt }), data: expect.objectContaining({ status: "PROCESSING" }) }))
  })

  it("loses the race when the compare-and-swap update affects no rows", async () => {
    const delivery = { id: "d1", status: "QUEUED", updatedAt: new Date() }
    prisma.notificationDelivery.findUnique.mockResolvedValueOnce(delivery).mockResolvedValueOnce({ ...delivery, status: "PROCESSING" })
    prisma.notificationDelivery.updateMany.mockResolvedValue({ count: 0 })
    const result = await claimDelivery({ id: "d1" })
    expect(result.claimed).toBe(false)
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalledTimes(1)
  })

  it("does not claim a delivery before its retry time", async () => {
    const nextAttemptAt = new Date("2026-08-17T08:00:00.000Z")
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: "d1", status: "FAILED", nextAttemptAt })
    const result = await claimDelivery({ id: "d1", now: new Date("2026-08-17T07:59:59.000Z") })
    expect(result.claimed).toBe(false)
    expect(prisma.notificationDelivery.updateMany).not.toHaveBeenCalled()
  })

  it("marks the fifth failure dead and clears retry scheduling", async () => {
    prisma.notificationDelivery.findUnique.mockResolvedValue({ id: "d1", status: "PROCESSING", attempts: MAX_ATTEMPTS - 1 })
    prisma.notificationDelivery.update.mockResolvedValue({ id: "d1", status: "DEAD" })
    await markDeliveryFailed("d1", new Error("provider failed"))
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "d1" }, data: expect.objectContaining({ status: "DEAD", attempts: MAX_ATTEMPTS, nextAttemptAt: null }) }))
  })

  it("uses bounded exponential retry delays", () => {
    const now = Date.now()
    const early = computeRetryAt(1).getTime() - now
    const later = computeRetryAt(4).getTime() - now
    const max = computeRetryAt(20).getTime() - now
    expect(early).toBeGreaterThanOrEqual(29_000)
    expect(later).toBeGreaterThan(early)
    expect(max).toBeLessThanOrEqual(3_600_000)
  })

  it("produces a stable idempotency key for the same logical delivery", () => {
    const input = { correlationId: "c1", event: "SUBMITTED", ruleId: "r1", recipient: "user@example.com", templateId: "t1" }
    expect(stableIdempotencyKey(input)).toBe(stableIdempotencyKey({ ...input }))
    expect(stableIdempotencyKey(input)).not.toBe(stableIdempotencyKey({ ...input, recipient: "other@example.com" }))
  })

  it("only marks a processing delivery as sent", async () => {
    prisma.notificationDelivery.update.mockResolvedValue({ id: "d1", status: "SENT" })
    await markDeliverySent("d1")
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "d1", status: "PROCESSING" }, data: expect.objectContaining({ status: "SENT" }) }))
  })
})