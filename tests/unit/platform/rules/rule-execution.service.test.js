import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }))
vi.mock("../../../../src/infrastructure/database/prisma", () => ({ $queryRaw: mocks.queryRaw }))

const { makeExecutionKey, claimAction, markSucceeded, markFailed, getDueActions, MAX_ATTEMPTS } = await import("../../../../src/platform/rules/rule-execution.service.js")

describe("rule execution idempotency", () => {
  beforeEach(() => mocks.queryRaw.mockReset())

  it("produces the same key for the same event/action identity", () => {
    const a = makeExecutionKey({ ruleId: "r1", actionIndex: 0, event: "SUBMITTED", entityType: "Request", entityId: "10", correlationId: "c1" })
    const b = makeExecutionKey({ ruleId: "r1", actionIndex: 0, event: "SUBMITTED", entityType: "Request", entityId: "10", correlationId: "c1" })
    expect(a).toBe(b)
  })

  it("changes identity when the action index or correlation changes", () => {
    const base = { ruleId: "r1", actionIndex: 0, event: "SUBMITTED", entityType: "Request", entityId: "10", correlationId: "c1" }
    expect(makeExecutionKey(base)).not.toBe(makeExecutionKey({ ...base, actionIndex: 1 }))
    expect(makeExecutionKey(base)).not.toBe(makeExecutionKey({ ...base, correlationId: "c2" }))
  })

  it("does not execute an already-succeeded action twice", async () => {
    mocks.queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "existing", status: "SUCCEEDED", attempts: 1 }])
    const result = await claimAction({ ruleId: "r1", actionIndex: 0, event: "E", correlationId: "c" })
    expect(result.claimed).toBe(false)
    expect(result.execution.status).toBe("SUCCEEDED")
  })

  it("marks a running action succeeded", async () => {
    mocks.queryRaw.mockResolvedValueOnce([{ id: "x", status: "SUCCEEDED" }])
    const result = await markSucceeded("x")
    expect(result.status).toBe("SUCCEEDED")
  })

  it("moves failed executions to retry or dead-letter", async () => {
    mocks.queryRaw.mockResolvedValueOnce([{ id: "x", attempts: 1 }])
    expect((await markFailed("x", "temporary")).status).toBe("PENDING")

    mocks.queryRaw.mockResolvedValueOnce([{ id: "y", attempts: MAX_ATTEMPTS }])
    expect((await markFailed("y", "permanent")).status).toBe("DEAD_LETTER")
  })

  it("bounds due-action fetches", async () => {
    mocks.queryRaw.mockResolvedValueOnce([])
    await getDueActions(1000)
    expect(mocks.queryRaw).toHaveBeenCalled()
  })
})
