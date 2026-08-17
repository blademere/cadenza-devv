import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = {
  slaPolicy: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  slaInstance: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}
const prismaModule = require("../../../../src/infrastructure/database/prisma")
prismaModule.getPrismaClient = () => mocks
const auditModule = require("../../../../src/platform/audit/audit.service")
auditModule.recordAudit = vi.fn()

const { completeSla, markDueSlas, markEscalations } = await import("../../../../src/platform/sla/sla.service.js")

describe("SLA hardening", () => {
  beforeEach(() => {
    for (const group of Object.values(mocks)) for (const mock of Object.values(group)) mock.mockReset()
    auditModule.recordAudit.mockReset()
  })

  it("allows completion from RUNNING, ESCALATED, and BREACHED", async () => {
    for (const status of ["RUNNING", "ESCALATED", "BREACHED"]) {
      mocks.slaInstance.findUnique.mockResolvedValueOnce({ id: "s1", status })
      mocks.slaInstance.update.mockResolvedValueOnce({ id: "s1", status: "COMPLETED" })
      const result = await completeSla({ instanceId: "s1" })
      expect(result.status).toBe("COMPLETED")
    }
  })

  it("rejects completion from terminal or invalid states", async () => {
    for (const status of ["COMPLETED", "CANCELLED"]) {
      mocks.slaInstance.findUnique.mockResolvedValueOnce({ id: "s1", status })
      await expect(completeSla({ instanceId: "s1" })).rejects.toThrow()
      expect(mocks.slaInstance.update).not.toHaveBeenCalled()
    }
  })

  it("breaches due RUNNING and ESCALATED instances atomically", async () => {
    const now = new Date("2026-08-17T08:00:00.000Z")
    mocks.slaInstance.findMany.mockResolvedValue([{ id: "s1" }, { id: "s2" }])
    mocks.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    const result = await markDueSlas({ now })
    expect(result.count).toBe(1)
    expect(mocks.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ["s1", "s2"] }, status: { in: ["RUNNING", "ESCALATED"] } }), data: { status: "BREACHED" } }))
  })

  it("claims escalation with an atomic null-escalatedAt guard", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    mocks.slaInstance.findMany.mockResolvedValue([{ id: "s1", startedAt, policy: { escalationSeconds: 60 } }])
    mocks.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    const result = await markEscalations({ now: new Date("2026-08-17T07:02:00.000Z") })
    expect(result.count).toBe(1)
    expect(mocks.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "RUNNING", escalatedAt: null }), data: expect.objectContaining({ escalatedAt: expect.any(Date) }) }))
  })

  it("reports zero when another worker has already claimed the escalation", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    mocks.slaInstance.findMany.mockResolvedValue([{ id: "s1", startedAt, policy: { escalationSeconds: 60 } }])
    mocks.slaInstance.updateMany.mockResolvedValue({ count: 0 })
    const result = await markEscalations({ now: new Date("2026-08-17T07:02:00.000Z") })
    expect(result.count).toBe(0)
  })
})
