const APPOINTMENT_MODULE = "appointments"

const APPOINTMENT_ACTIONS = Object.freeze({
  READ: "read",
  CREATE: "create",
  UPDATE: "update",
  CANCEL: "cancel",
  CHECK_IN: "check_in",
  MANAGE: "manage",
})

const APPOINTMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
})

const SLOT_STATUS = Object.freeze({
  OPEN: "OPEN",
  CLOSED: "CLOSED",
})

module.exports = {
  APPOINTMENT_MODULE,
  APPOINTMENT_ACTIONS,
  APPOINTMENT_STATUS,
  SLOT_STATUS,
}
