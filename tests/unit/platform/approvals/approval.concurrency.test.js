import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  $transaction: vi.fn(),
  approvalPolicy: { findUnique: vi.fn(), findMany: vi.fn() },
  approvalInstance: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  approvalRequest: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  user: { findFirst: vi.fn(), findMany: vi.fn() },
}))
vi.mock("../../../../src/infrastructure/database/prisma", () => ({ getPrismaClient: () => mocks }))
vi.mock("../../../../src/platform/rules/rule.service", () => ({ evaluateCondition: vi.fn(() => true), validateCondition: vi.fn() }))
vi.mock("../../../../src/platform/audit/audit.service", () => ({ recordAudit: vi.fn() }))

const prisma = await import("../../../../src/infrastructure/database/prisma").then((module) => module.getPrismaClient())
const { actOnApproval, startApproval } = await import("../../../../src/platform/approvals/approval.service.js")

describe("approval hardening", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(mocks)) {
      if (typeof value === "function") value.mockReset()
      else for (const mock of Object.values(value)) mock.mockReset()
    }
  })

  it("returns the existing pending instance instead of creating another one", async () => {
    const existing = { id: "a1", policyId: "p1", subjectType: "Request", subjectId: "42", status: "PENDING", policy: { steps: [] }, requests: [] }
    prisma.approvalPolicy.findUnique.mockResolvedValue({ id: "p1", key: "policy", steps: [{ id: "s1", stepOrder: 1, name: "Review", approverType: "USER", approverValue: "7", requiredCount: 1 }] })
    prisma.$transaction.mockImplementation(async (callback) => callback({ approvalInstance: { findFirst: vi.fn().mockResolvedValue(existing), create: vi.fn(), findUnique: vi.fn() }, approvalRequest: { createMany: vi.fn() }, user: { findFirst: vi.fn().mockResolvedValue({ id: 7 }) } }))
    const result = await startApproval({ policyKey: "policy", subjectType: "Request", subjectId: 42 })
    expect(result.id).toBe("a1")
    expect(result.status).toBe("PENDING")
  })

  it("recovers from a unique-constraint race by reloading the winner", async () => {
    const winner = { id: "a2", status: "PENDING", policy: { steps: [] }, requests: [] }
    prisma.approvalPolicy.findUnique.mockResolvedValue({ id: "p1", key: "policy", steps: [{ id: "s1", stepOrder: 1, name: "Review", approverType: "USER", approverValue: "7", requiredCount: 1 }] })
    prisma.$transaction.mockRejectedValue({ code: "P2002" })
    prisma.approvalInstance.findFirst.mockResolvedValue(winner)
    const result = await startApproval({ policyKey: "policy", subjectType: "Request", subjectId: 42 })
    expect(result).toBe(winner)
    expect(prisma.approvalInstance.findFirst).toHaveBeenCalled()
  })

  it("cancels remaining requests when an approver rejects", async () => {
    const request = { id: "r1", status: "PENDING", assigneeUserId: 7, stepId: "s1", instanceId: "a1", instance: { id: "a1", status: "PENDING", currentStepOrder: 1, policy: { steps: [{ id: "s1", stepOrder: 1 }] } }, step: { id: "s1", stepOrder: 1, requiredCount: 2 } }
    prisma.approvalRequest.findUnique.mockResolvedValue(request)
    const tx = { approvalRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn() }, approvalInstance: { update: vi.fn().mockResolvedValue({ id: "a1", status: "REJECTED", requests: [] }) } }
    prisma.$transaction.mockImplementation(async (callback) => callback(tx))
    const result = await actOnApproval({ requestId: "r1", actorId: 7, decision: "REJECT" })
    expect(result.status).toBe("REJECTED")
    expect(tx.approvalRequest.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.approvalRequest.updateMany.mock.calls[1][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ instanceId: "a1", status: "PENDING" }), data: expect.objectContaining({ status: "CANCELLED" }) }))
  })

  it("skips remaining requests after quorum and activates the next step", async () => {
    const request = { id: "r1", status: "PENDING", assigneeUserId: 7, stepId: "s1", instanceId: "a1", instance: { id: "a1", status: "PENDING", currentStepOrder: 1, policy: { steps: [{ id: "s1", stepOrder: 1 }, { id: "s2", stepOrder: 2 }] } }, step: { id: "s1", stepOrder: 1, requiredCount: 1 } }
    prisma.approvalRequest.findUnique.mockResolvedValue(request)
    const tx = { approvalRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findMany: vi.fn().mockResolvedValue([{ status: "APPROVED" }, { status: "PENDING" }]), createMany: vi.fn() }, approvalInstance: { update: vi.fn().mockResolvedValue({ id: "a1", status: "PENDING", currentStepOrder: 2, requests: [] }) }, user: { findMany: vi.fn().mockResolvedValue([{ id: 8 }]) } }
    prisma.$transaction.mockImplementation(async (callback) => callback(tx))
    const result = await actOnApproval({ requestId: "r1", actorId: 7, decision: "APPROVE" })
    expect(result.currentStepOrder).toBe(2)
    expect(tx.approvalRequest.updateMany.mock.calls[1][0]).toEqual(expect.objectContaining({ where: expect.objectContaining({ instanceId: "a1", stepId: "s1", status: "PENDING" }), data: expect.objectContaining({ status: "SKIPPED" }) }))
    expect(tx.approvalRequest.createMany).toHaveBeenCalled()
  })
})