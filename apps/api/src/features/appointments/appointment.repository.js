import { getPrismaClient } from '../../infrastructure/database/prisma.js'
const prisma = getPrismaClient()

const withTransaction = (callback) => prisma.$transaction(callback)
const findAppointmentType = (id, db = prisma) =>
  db.appointmentType.findUnique({ where: { id } })
const listAppointmentTypes = ({ active }, db = prisma) =>
  db.appointmentType.findMany({
    where: active === undefined ? undefined : { isActive: active },
    orderBy: { name: 'asc' },
  })
const createAppointmentType = (data, db = prisma) =>
  db.appointmentType.create({ data })
const findSchedule = ({ id, appointmentTypeId }, db = prisma) =>
  db.availabilitySchedule.findFirst({ where: { id, appointmentTypeId } })
const listActiveSchedules = ({ appointmentTypeId, scheduleId }, db = prisma) =>
  db.availabilitySchedule.findMany({
    where: {
      appointmentTypeId,
      isActive: true,
      ...(scheduleId ? { id: scheduleId } : {}),
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
const createAvailabilitySchedule = (data, db = prisma) =>
  db.availabilitySchedule.create({ data })
const createAppointmentSlot = (data, db = prisma) =>
  db.appointmentSlot.create({ data })
const findSlotByStart = ({ appointmentTypeId, startsAt }, db = prisma) =>
  db.appointmentSlot.findUnique({
    where: { appointmentTypeId_startsAt: { appointmentTypeId, startsAt } },
  })
const listAppointmentSlots = (
  { appointmentTypeId, from, to, status },
  db = prisma
) =>
  db.appointmentSlot.findMany({
    where: {
      ...(appointmentTypeId ? { appointmentTypeId } : {}),
      ...(status ? { status } : { status: 'OPEN' }),
      appointmentType: { isActive: true },
      OR: [{ scheduleId: null }, { schedule: { isActive: true } }],
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lt: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startsAt: 'asc' },
  })
const findSlot = (id, db = prisma) =>
  db.appointmentSlot.findUnique({
    where: { id },
    include: { schedule: true, appointmentType: true },
  })
const findActiveUserAppointmentForSlot = (
  { slotId, userId, statuses },
  db = prisma
) =>
  db.appointment.findFirst({
    where: { slotId, userId, status: { in: statuses } },
    select: { id: true },
  })
const claimSlot = ({ slotId, capacity }, db) =>
  db.appointmentSlot.updateMany({
    where: {
      id: slotId,
      status: 'OPEN',
      bookedCount: { lt: capacity },
      appointmentType: { isActive: true },
      OR: [{ scheduleId: null }, { schedule: { isActive: true } }],
    },
    data: { bookedCount: { increment: 1 }, updatedAt: new Date() },
  })
const createAppointment = (data, db) =>
  db.appointment.create({
    data,
    include: { appointmentType: true, slot: true },
  })
const findUserAppointment = ({ id, userId }, db = prisma) =>
  db.appointment.findFirst({
    where: { id, userId },
    include: { appointmentType: true, slot: true },
  })
const findAppointment = (id, db = prisma) =>
  db.appointment.findUnique({ where: { id } })
const listUserAppointments = (userId, db = prisma) =>
  db.appointment.findMany({
    where: { userId },
    include: { appointmentType: true, slot: true },
    orderBy: { createdAt: 'desc' },
  })
const cancelAppointmentRecord = (id, db) =>
  db.appointment.update({
    where: { id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
    include: { appointmentType: true, slot: true },
  })
const releaseSlot = (slotId, db) =>
  db.appointmentSlot.updateMany({
    where: { id: slotId, bookedCount: { gt: 0 } },
    data: { bookedCount: { decrement: 1 } },
  })
const transitionAppointment = (
  { id, fromStatus, status, timestampField },
  db = prisma
) =>
  db.appointment.updateMany({
    where: { id, status: fromStatus },
    data: { status, [timestampField]: new Date() },
  })
const getAppointmentWithRelations = (id, db = prisma) =>
  db.appointment.findUnique({
    where: { id },
    include: { appointmentType: true, slot: true },
  })
module.exports = {
  withTransaction,
  findAppointmentType,
  listAppointmentTypes,
  createAppointmentType,
  findSchedule,
  listActiveSchedules,
  createAvailabilitySchedule,
  createAppointmentSlot,
  findSlotByStart,
  listAppointmentSlots,
  findSlot,
  findActiveUserAppointmentForSlot,
  claimSlot,
  createAppointment,
  findUserAppointment,
  findAppointment,
  listUserAppointments,
  cancelAppointmentRecord,
  releaseSlot,
  transitionAppointment,
  getAppointmentWithRelations,
}
