const crypto = require("node:crypto")

const { getPrismaClient } = require("../../infrastructure/database/prisma")
const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require("../../common/errors/appError")
const { APPOINTMENT_STATUS, SLOT_STATUS } = require("./appointment.constants")

const prisma = getPrismaClient()

const createReferenceNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `APT-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
}

const listAppointmentTypes = async ({ active }) => {
  return prisma.appointmentType.findMany({
    where: active === undefined ? undefined : { isActive: active },
    orderBy: { name: "asc" },
  })
}

const createAppointmentType = async (data) => prisma.appointmentType.create({ data })

const createAvailabilitySchedule = async (data) => {
  const type = await prisma.appointmentType.findUnique({ where: { id: data.appointmentTypeId } })
  if (!type) throw new NotFoundError("Appointment type not found.")
  if (data.startTime >= data.endTime) throw new BadRequestError("Schedule startTime must be earlier than endTime.")
  return prisma.availabilitySchedule.create({ data })
}

const createAppointmentSlot = async (data) => {
  const type = await prisma.appointmentType.findUnique({ where: { id: data.appointmentTypeId } })
  if (!type) throw new NotFoundError("Appointment type not found.")
  if (data.endsAt <= data.startsAt) throw new BadRequestError("Slot endsAt must be later than startsAt.")

  if (data.scheduleId) {
    const schedule = await prisma.availabilitySchedule.findFirst({ where: { id: data.scheduleId, appointmentTypeId: data.appointmentTypeId } })
    if (!schedule) throw new BadRequestError("Schedule does not belong to the appointment type.")
  }
  return prisma.appointmentSlot.create({ data })
}

const listAppointmentSlots = async ({ appointmentTypeId, from, to, status }) => prisma.appointmentSlot.findMany({
  where: {
    ...(appointmentTypeId ? { appointmentTypeId } : {}),
    ...(status ? { status } : { status: SLOT_STATUS.OPEN }),
    ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  },
  orderBy: { startsAt: "asc" },
})

const bookAppointment = async ({ userId, appointmentTypeId, slotId, metadata, notes }) => {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.appointmentSlot.findUnique({ where: { id: slotId } })
    if (!slot) throw new NotFoundError("Appointment slot not found.")
    if (slot.appointmentTypeId !== appointmentTypeId) throw new BadRequestError("Slot does not belong to the appointment type.")
    if (slot.startsAt <= new Date()) throw new ConflictError("Appointment slot is no longer bookable.")

    const existing = await tx.appointment.findFirst({
      where: { slotId, userId, status: { in: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN] } },
      select: { id: true },
    })
    if (existing) throw new ConflictError("You already have an active appointment for this slot.")

    const claimed = await tx.appointmentSlot.updateMany({
      where: { id: slotId, status: SLOT_STATUS.OPEN, bookedCount: { lt: slot.capacity } },
      data: { bookedCount: { increment: 1 }, updatedAt: new Date() },
    })
    if (claimed.count !== 1) throw new ConflictError("Appointment slot is full or closed.")

    return tx.appointment.create({
      data: { referenceNumber: createReferenceNumber(), appointmentTypeId, slotId, userId, status: APPOINTMENT_STATUS.CONFIRMED, metadata, notes },
      include: { appointmentType: true, slot: true },
    })
  })
}

const getMyAppointment = async ({ id, userId }) => {
  const appointment = await prisma.appointment.findFirst({ where: { id, userId }, include: { appointmentType: true, slot: true } })
  if (!appointment) throw new NotFoundError("Appointment not found.")
  return appointment
}

const listMyAppointments = async ({ userId }) => prisma.appointment.findMany({
  where: { userId }, include: { appointmentType: true, slot: true }, orderBy: { createdAt: "desc" },
})

const cancelAppointment = async ({ id, userId }) => prisma.$transaction(async (tx) => {
  const appointment = await tx.appointment.findFirst({ where: { id, userId } })
  if (!appointment) throw new NotFoundError("Appointment not found.")
  if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError("Only pending or confirmed appointments can be cancelled.")

  const updated = await tx.appointment.update({
    where: { id }, data: { status: APPOINTMENT_STATUS.CANCELLED, cancelledAt: new Date() }, include: { appointmentType: true, slot: true },
  })
  await tx.appointmentSlot.updateMany({ where: { id: appointment.slotId, bookedCount: { gt: 0 } }, data: { bookedCount: { decrement: 1 }, updatedAt: new Date() } })
  return updated
})

const updateAppointmentStatus = async ({ id, fromStatus, status, timestampField }) => {
  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) throw new NotFoundError("Appointment not found.")
  if (appointment.status !== fromStatus) throw new ConflictError(`Only ${fromStatus.toLowerCase().replaceAll("_", " ")} appointments can be changed to ${status.toLowerCase().replaceAll("_", " ")}.`)
  return prisma.appointment.update({ where: { id }, data: { status, [timestampField]: new Date() }, include: { appointmentType: true, slot: true } })
}

const checkInAppointment = async ({ id }) => updateAppointmentStatus({ id, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.CHECKED_IN, timestampField: "checkedInAt" })
const completeAppointment = async ({ id }) => updateAppointmentStatus({ id, fromStatus: APPOINTMENT_STATUS.CHECKED_IN, status: APPOINTMENT_STATUS.COMPLETED, timestampField: "completedAt" })
const markNoShow = async ({ id }) => updateAppointmentStatus({ id, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.NO_SHOW, timestampField: "completedAt" })

module.exports = {
  listAppointmentTypes,
  createAppointmentType,
  createAvailabilitySchedule,
  createAppointmentSlot,
  listAppointmentSlots,
  bookAppointment,
  getMyAppointment,
  listMyAppointments,
  cancelAppointment,
  checkInAppointment,
  completeAppointment,
  markNoShow,
}
