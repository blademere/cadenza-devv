import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("../../../../src/infrastructure/database/prisma", () => ({
  slaPolicy: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  slaInstance: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}))
vi.mock("../../../../src/platform/rules/rule.service", () => ({ evaluateCondition: vi.fn(() => true), validateCondition: vi.fn() }))
vi.mock("../../../../src/platform/audit/audit.service", () => ({ recordAudit: vi.fn() }))

const prisma = require("../../../../src/infrastructure/database/prisma")
const { completeSla, markDueSlas, markEscalations } = require("../../../../src/platform/sla/sla.service")

describe("SLA hardening", () => {
  beforeEach(() => vi.clearAllMocks())

  it("allows completion from RUNNING, ESCALATED, and BREACHED", async () => {
    for (const status of ["RUNNING", "ESCALATED", "BREACHED"]) {
      prisma.slaInstance.findUnique.mockResolvedValueOnce({ id: "s1", status })
      prisma.slaInstance.update.mockResolvedValueOnce({ id: "s1", status: "COMPLETED" })
      const result = await completeSla({ instanceId: "s1" })
      expect(result.status).toBe("COMPLETED")
    }
  })

  it("rejects completion from terminal or invalid states", async () => {
    for (const status of ["COMPLETED", "CANCELLED"]) {
      prisma.slaInstance.findUnique.mockResolvedValueOnce({ id: "s1", status })
      await expect(completeSla({ instanceId: "s1" })).rejects.toThrow()
      expect(prisma.slaInstance.update).not.toHaveBeenCalled()
    }
  })

  it("breaches due RUNNING and ESCALATED instances atomically", async () => {
    const now = new Date("2026-08-17T08:00:00.000Z")
    prisma.slaInstance.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }])
    prisma.slaInstance.updateMany.mockResolvedValue({ count: 1 })

    const result = await markDueSlas({ now })

    expect(result.count).toBe(1)
    expect(prisma.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ["s1", "s2"] }, status: { in: ["RUNNING", "ESCALATED"] } }),
      data: { status: "BREACHED" },
    }))
  })

  it("claims escalation with an atomic null-escalatedAt guard", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    prisma.slaInstance.findMany.mockResolvedValue([{ id: "s1", startedAt, policy: { escalationSeconds: 60 } }])
    prisma.slaInstance.updateMany.mockResolvedValue({ count: 1 })

    const result = await markEscalations({ now: new Date("2026-08-17T07:02:00.000Z") })

    expect(result.count).toBe(1)
    expect(prisma.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "RUNNING", escalatedAt: null }),
      data: expect.objectContaining({ escalatedAt: expect.any(Date) }),
    }))
  })

  it("reports zero when another worker has already claimed the escalation", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    prisma.slaInstance.findMany.mockResolvedValue([{ id: "s1", startedAt, policy: { escalationSeconds: 60 } }])
    prisma.slaInstance.updateMany.mockResolvedValue({ count: 0 })

    const result = await markEscalations({ now: new Date("2026-08-17T07:02:00.000Z") })

    expect(result.count).toBe(0)
  })
})
