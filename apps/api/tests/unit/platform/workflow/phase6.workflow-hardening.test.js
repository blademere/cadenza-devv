import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const readText = (path) => readFile(new URL(path, import.meta.url), "utf8")

describe("Platform Workflow Phase 6 hardening", () => {
  it("records correlation ids in workflow history and uses an atomic state transition", async () => {
    const service = await readText(
      "../../../../src/platform/workflow/workflow.service.js",
    )
    const repository = await readText(
      "../../../../src/platform/workflow/workflow.repository.js",
    )
    const schema = await readText(
      "../../../../prisma/platform/workflow.prisma",
    )

    expect(service).toContain("getContext")
    expect(service).toContain("const correlationId = resolveCorrelationId()")
    expect(service).toContain("correlationId,")
    expect(service).toContain("updateInstanceStep(")
    expect(service).toContain("currentStepId: instance.currentStepId")
    expect(service).toContain("Workflow instance changed concurrently")

    expect(repository).toContain("db.workflowInstance.updateMany")
    expect(repository).toContain("currentStepId: expectedStepId")
    expect(repository).toContain("completedAt: null")
    expect(repository).toContain("currentStepId: toStepId")

    expect(schema).toContain("correlationId String?")
  })

  it("enforces one published workflow version per workflow at the database boundary", async () => {
    const migration = await readText(
      "../../../../prisma/migrations/20260911133000_harden_workflow_concurrency/migration.sql",
    )

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "WorkflowVersion_one_published_per_workflow_idx"',
    )
    expect(migration).toContain('WHERE "status" = \'PUBLISHED\'')
  })
})
