import { describe, expect, it } from "vitest"
import {
  APPOINTMENT_ACTIONS,
  APPOINTMENT_STATUS,
  SLOT_STATUS,
} from "../../../src/features/appointments/appointment.constants.js"

describe("appointment constants", () => {
  it("exposes the complete appointment lifecycle", () => {
    expect(APPOINTMENT_STATUS).toMatchObject({
      PENDING: "PENDING",
      CONFIRMED: "CONFIRMED",
      CHECKED_IN: "CHECKED_IN",
      COMPLETED: "COMPLETED",
      CANCELLED: "CANCELLED",
      NO_SHOW: "NO_SHOW",
    })
  })

  it("exposes management actions including no-show", () => {
    expect(APPOINTMENT_ACTIONS).toMatchObject({
      READ: "read",
      CREATE: "create",
      CANCEL: "cancel",
      CHECK_IN: "check_in",
      NO_SHOW: "no_show",
      MANAGE: "manage",
    })
    expect(SLOT_STATUS.OPEN).toBe("OPEN")
  })
})
