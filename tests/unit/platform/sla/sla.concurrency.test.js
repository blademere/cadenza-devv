import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = {
  slaPolicy: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  slaInstance: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}
const prismaModule = require("../../../../src/infrastructure/database/prisma")
prismaModule.getPrismaClient = () => mocks
const auditModule = require("../../../../src/platform/audit/audit.service")
auditModule.recordAudit = vi.fn()

const { createSlaPolicy, findApplicablePolicy, startSla, completeSla, markDueSlas, markEscalations } = await import("../../../../src/platform/sla/sla.service.js")

describe("SLA hardening", () => {
  beforeEach(() => {
    for (const group of Object.values(mocks)) for (const mock of Object.values(group)) mock.mockReset()
    auditModule.recordAudit.mockReset()
  })

  it("rejects escalation at or after the SLA deadline", async () => {
    for (const escalationSeconds of [300, 301]) {
      await expect(createSlaPolicy({ key: "sla", name: "SLA", entityType: "CASE", durationSeconds: 300, escalationSeconds, conditions: { field: "tier", operator: "equals", value: "gold" } })).rejects.toThrow("before the SLA deadline")
    }
    expect(mocks.slaPolicy.create).not.toHaveBeenCalled()
  })

  it("accepts a valid escalation before the deadline", async () => {
    mocks.slaPolicy.create.mockResolvedValue({ id: "p1", key: "sla" })
    const result = await createSlaPolicy({ key: "sla", name: "SLA", entityType: "CASE", durationSeconds: 300, escalationSeconds: 299, conditions: { field: "tier", operator: "equals", value: "gold" } })
    expect(result.id).toBe("p1")
    expect(mocks.slaPolicy.create).toHaveBeenCalledOnce()
  })

  it("selects the first matching active policy in priority order", async () => {
    mocks.slaPolicy.findMany.mockResolvedValue([
      { id: "p-high", priority: 10, conditions: { field: "tier", operator: "equals", value: "gold" } },
      { id: "p-low", priority: 20, conditions: { field: "tier", operator: "equals", value: "gold" } },
    ])
    const result = await findApplicablePolicy({ entityType: "CASE", context: { tier: "gold" } })
    expect(result.id).toBe("p-high")
    expect(mocks.slaPolicy.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ priority: "asc" }, { createdAt: "asc" }] }))
  })

  it("does not terminalize an SLA when escalation is processed", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    mocks.slaInstance.findMany.mockResolvedValue([{ id: "s1", startedAt, policy: { escalationSeconds: 60 } }])
    mocks.slaInstance.updateMany.mockResolvedValue({ count: 1 })
    await markEscalations({ now: new Date("2026-08-17T07:02:00.000Z") })
    expect(mocks.slaInstance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { escalatedAt: expect.any(Date) } }))
    expect(mocks.slaInstance.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: expect.anything() }) }))
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

  it("starts an SLA with due and warning timestamps derived from the policy", async () => {
    const startedAt = new Date("2026-08-17T07:00:00.000Z")
    mocks.slaPolicy.findUnique.mockResolvedValue({ id: "p1", durationSeconds: 300, warningSeconds: 120 })
    mocks.slaInstance.create.mockResolvedValue({ id: "s1" })
    await startSla({ policyKey: "sla", subjectType: "CASE", subjectId: 42, startedAt })
    expect(mocks.slaInstance.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ policyId: "p1", subjectId: "42", startedAt, warningAt: new Date("2026-08-17T07:02:00.000Z"), dueAt: new Date("2026-08-17T07:05:00.000Z") }) }))
  })
})
