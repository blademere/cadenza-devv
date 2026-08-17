import { describe, expect, it } from "vitest"

const prisma = {
  approvalPolicy: { findUnique: vi.fn() },
  approvalInstance: { findFirst: vi.fn() },
}

vi.mock("../../../../src/infrastructure/database/prisma", () => ({ default: prisma }))

describe("approval start idempotency contract", () => {
  it("defines an active-instance uniqueness boundary", async () => {
    const migration = await import("fs/promises").then((fs) => fs.readFile("prisma/migrations/20260817200000_approval_instance_active_uniqueness/migration.sql", "utf8"))
    expect(migration).toContain('CREATE UNIQUE INDEX "ApprovalInstance_active_subject_unique"')
    expect(migration).toContain('WHERE "status" = \'PENDING\'')
  })

  it("keeps completed approvals outside the active uniqueness boundary", async () => {
    const migration = await import("fs/promises").then((fs) => fs.readFile("prisma/migrations/20260817200000_approval_instance_active_uniqueness/migration.sql", "utf8"))
    expect(migration).not.toContain('CREATE UNIQUE INDEX "ApprovalInstance_subject_unique"')
  })
})
