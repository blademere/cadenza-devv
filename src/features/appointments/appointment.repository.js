const { getPrismaClient } = require('../../infrastructure/database/prisma')
const prisma = getPrismaClient()

const findAppointmentType = (id, db = prisma) => db.appointmentType.findUnique({ where: { id } })
const listAppointmentTypes = ({ active }, db = prisma) => db.appointmentType.findMany({ where: active === undefined ? undefined : { isActive: active }, orderBy: { name: 'asc' } })
const createAppointmentType = (data, db = prisma) => db.appointmentType.create({ data })
const findSchedule = ({ id, appointmentTypeId }, db = prisma) => db.availabilitySchedule.findFirst({ where: { id, appointmentTypeId } })
const createAvailabilitySchedule = (data, db = prisma) => db.availabilitySchedule.create({ data })
const createAppointmentSlot = (data, db = prisma) => db.appointmentSlot.create({ data })
const listAppointmentSlots = ({ appointmentTypeId, from, to, status }, db = prisma) => db.appointmentSlot.findMany({
  where: {
    ...(appointmentTypeId ? { appointmentTypeId } : {}),
    ...(status ? { status } : { status: 'OPEN' }),
    ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
  },
  orderBy: { startsAt: 'asc' },
})
const findSlot = (id, db = prisma) => db.appointmentSlot.findUnique({ where: { id } })
const findActiveUserAppointmentForSlot = ({ slotId, userId, statuses }, db = prisma) => db.appointment.findFirst({ where: { slotId, userId, status: { in: statuses } }, select: { id: true } })
const claimSlot = ({ slotId, capacity }, db) => db.appointmentSlot.updateMany({ where: { id: slotId, status: 'OPEN', bookedCount: { lt: capacity } }, data: { bookedCount: { increment: 1 }, updatedAt: new Date() } })
const createAppointment = (data, db) => db.appointment.create({ data, include: { appointmentType: true, slot: true } })
const findUserAppointment = ({ id, userId }, db = prisma) => db.appointment.findFirst({ where: { id, userId }, include: { appointmentType: true, slot: true } })
const findAppointment = (id, db = prisma) => db.appointment.findUnique({ where: { id } })
const listUserAppointments = (userId, db = prisma) => db.appointment.findMany({ where: { userId }, include: { appointmentType: true, slot: true }, orderBy: { createdAt: 'desc' } })
const cancelAppointmentRecord = (id, db) => db.appointment.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() }, include: { appointmentType: true, slot: true } })
const releaseSlot = (slotId, db) => db.appointmentSlot.updateMany({ where: { id: slotId, bookedCount: { gt: 0 } }, data: { bookedCount: { decrement: 1 }, updatedAt: new Date() } })
const transitionAppointment = ({ id, fromStatus, status, timestampField }, db) => db.appointment.updateMany({ where: { id, status: fromStatus }, data: { status, [timestampField]: new Date() } })
const getAppointmentWithRelations = (id, db = prisma) => db.appointment.findUnique({ where: { id }, include: { appointmentType: true, slot: true } })

module.exports = {
  findAppointmentType,
  listAppointmentTypes,
  createAppointmentType,
  findSchedule,
  createAvailabilitySchedule,
  createAppointmentSlot,
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
