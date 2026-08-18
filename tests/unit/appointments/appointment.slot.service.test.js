import { describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  appointmentType: { findUnique: vi.fn() },
  availabilitySchedule: { findMany: vi.fn() },
  $transaction: vi.fn(),
}))

vi.mock("../../../src/infrastructure/database/prisma.js", () => ({
  getPrismaClient: () => prisma,
}))

const { generateSlots } = await import("../../../src/features/appointments/appointment.slot.service.js")

describe("appointment slot generation", () => {
  it("generates slots from an Asia/Manila weekly schedule", async () => {
    prisma.appointmentType.findUnique.mockResolvedValue({ id: "type-1" })
    prisma.availabilitySchedule.findMany.mockResolvedValue([{
      id: "schedule-1",
      appointmentTypeId: "type-1",
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
      timezone: "Asia/Manila",
      slotDurationMinutes: 30,
      capacity: 3,
      isActive: true,
    }])

    const created = []
    prisma.$transaction.mockImplementation(async (callback) => callback({
      appointmentSlot: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(async ({ data }) => {
          created.push(data)
          return { id: `slot-${created.length}`, ...data }
        }),
      },
    }))

    const result = await generateSlots({
      appointmentTypeId: "type-1",
      from: new Date("2026-08-18T00:00:00.000Z"),
      to: new Date("2026-08-19T00:00:00.000Z"),
    })

    expect(result).toHaveLength(2)
    expect(created[0].scheduleId).toBe("schedule-1")
    expect(created[0].capacity).toBe(3)
    expect(created[0].startsAt.toISOString()).toBe("2026-08-18T01:00:00.000Z")
    expect(created[1].startsAt.toISOString()).toBe("2026-08-18T01:30:00.000Z")
  })

  it("rejects an invalid generation window", async () => {
    await expect(generateSlots({
      appointmentTypeId: "type-1",
      from: new Date("2026-08-19T00:00:00.000Z"),
      to: new Date("2026-08-18T00:00:00.000Z"),
    })).rejects.toThrow("from must be earlier than to")
  })
})
