const crypto = require('node:crypto')
const { ConflictError, NotFoundError, BadRequestError } = require('../../common/errors/appError')
const { APPOINTMENT_STATUS } = require('./appointment.constants')
const repository = require('./appointment.repository')
const { recordAudit } = require('../../platform/audit/audit.service')
const { getPrismaClient } = require('../../infrastructure/database/prisma')
const prisma = getPrismaClient()

const createReferenceNumber = () => `APT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`

const listAppointmentTypes = ({ active }) => repository.listAppointmentTypes({ active })

const createAppointmentType = async ({ actorId, data }) => prisma.$transaction(async (tx) => {
  const created = await repository.createAppointmentType(data, tx)
  await recordAudit({ actorId, action: 'APPOINTMENT_TYPE_CREATED', entityType: 'AppointmentType', entityId: created.id, before: null, after: created, db: tx })
  return created
})

const createAvailabilitySchedule = async ({ actorId, data }) => prisma.$transaction(async (tx) => {
  const type = await repository.findAppointmentType(data.appointmentTypeId, tx)
  if (!type) throw new NotFoundError('Appointment type not found.')
  if (data.startTime >= data.endTime) throw new BadRequestError('Schedule startTime must be earlier than endTime.')
  if (data.slotDurationMinutes <= 0 || data.capacity <= 0) throw new BadRequestError('Schedule duration and capacity must be positive.')
  if (data.dayOfWeek < 0 || data.dayOfWeek > 6) throw new BadRequestError('Schedule dayOfWeek must be between 0 and 6.')
  const created = await repository.createAvailabilitySchedule(data, tx)
  await recordAudit({ actorId, action: 'APPOINTMENT_SCHEDULE_CREATED', entityType: 'AvailabilitySchedule', entityId: created.id, before: null, after: created, db: tx })
  return created
})

const createAppointmentSlot = async ({ actorId, data }) => prisma.$transaction(async (tx) => {
  const type = await repository.findAppointmentType(data.appointmentTypeId, tx)
  if (!type) throw new NotFoundError('Appointment type not found.')
  if (data.endsAt <= data.startsAt) throw new BadRequestError('Slot endsAt must be later than startsAt.')
  if (data.capacity <= 0) throw new BadRequestError('Slot capacity must be positive.')
  if (data.scheduleId && !(await repository.findSchedule({ id: data.scheduleId, appointmentTypeId: data.appointmentTypeId }, tx))) throw new BadRequestError('Schedule does not belong to the appointment type.')
  const created = await repository.createAppointmentSlot(data, tx)
  await recordAudit({ actorId, action: 'APPOINTMENT_SLOT_CREATED', entityType: 'AppointmentSlot', entityId: created.id, before: null, after: created, db: tx })
  return created
})

const listAppointmentSlots = ({ appointmentTypeId, from, to, status }) => repository.listAppointmentSlots({ appointmentTypeId, from, to, status })

const bookAppointment = async ({ userId, appointmentTypeId, slotId, metadata, notes, db }) => {
  const execute = async (tx) => {
    const slot = await repository.findSlot(slotId, tx)
    if (!slot) throw new NotFoundError('Appointment slot not found.')
    if (slot.appointmentTypeId !== appointmentTypeId) throw new BadRequestError('Slot does not belong to the appointment type.')
    if (slot.startsAt <= new Date()) throw new ConflictError('Appointment slot is no longer bookable.')
    const existing = await repository.findActiveUserAppointmentForSlot({ slotId, userId, statuses: [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CHECKED_IN] }, tx)
    if (existing) throw new ConflictError('You already have an active appointment for this slot.')
    const claimed = await repository.claimSlot({ slotId, capacity: slot.capacity }, tx)
    if (claimed.count !== 1) throw new ConflictError('Appointment slot is full or closed.')
    const created = await repository.createAppointment({ referenceNumber: createReferenceNumber(), appointmentTypeId, slotId, userId, status: APPOINTMENT_STATUS.CONFIRMED, metadata, notes }, tx)
    await recordAudit({ actorId: userId, action: 'APPOINTMENT_CREATED', entityType: 'Appointment', entityId: created.id, before: null, after: created, db: tx })
    return created
  }
  return db ? execute(db) : prisma.$transaction(execute)
}

const getMyAppointment = async ({ id, userId }) => {
  const appointment = await repository.findUserAppointment({ id, userId })
  if (!appointment) throw new NotFoundError('Appointment not found.')
  return appointment
}

const listMyAppointments = ({ userId }) => repository.listUserAppointments(userId)

const cancelAppointment = async ({ id, userId }) => prisma.$transaction(async (tx) => {
  const appointment = await repository.findUserAppointment({ id, userId }, tx)
  if (!appointment) throw new NotFoundError('Appointment not found.')
  if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(appointment.status)) throw new ConflictError('Only pending or confirmed appointments can be cancelled.')
  const updated = await repository.cancelAppointmentRecord(id, tx)
  await repository.releaseSlot(appointment.slotId, tx)
  await recordAudit({ actorId: userId, action: 'APPOINTMENT_CANCELLED', entityType: 'Appointment', entityId: id, before: appointment, after: updated, db: tx })
  return updated
})

const updateAppointmentStatus = async ({ id, actorId, fromStatus, status, timestampField }) => prisma.$transaction(async (tx) => {
  const before = await repository.findAppointment(id, tx)
  if (!before) throw new NotFoundError('Appointment not found.')
  const updated = await repository.transitionAppointment({ id, fromStatus, status, timestampField }, tx)
  if (updated.count !== 1) throw new ConflictError(`Only ${fromStatus.toLowerCase().replaceAll('_', ' ')} appointments can be changed to ${status.toLowerCase().replaceAll('_', ' ')}.`)
  const after = await repository.getAppointmentWithRelations(id, tx)
  await recordAudit({ actorId, action: `APPOINTMENT_${status}`, entityType: 'Appointment', entityId: id, before, after, db: tx })
  return after
})

const checkInAppointment = ({ id, actorId }) => updateAppointmentStatus({ id, actorId, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.CHECKED_IN, timestampField: 'checkedInAt' })
const completeAppointment = ({ id, actorId }) => updateAppointmentStatus({ id, actorId, fromStatus: APPOINTMENT_STATUS.CHECKED_IN, status: APPOINTMENT_STATUS.COMPLETED, timestampField: 'completedAt' })
const markNoShow = ({ id, actorId }) => updateAppointmentStatus({ id, actorId, fromStatus: APPOINTMENT_STATUS.CONFIRMED, status: APPOINTMENT_STATUS.NO_SHOW, timestampField: 'noShowAt' })

module.exports = { listAppointmentTypes, createAppointmentType, createAvailabilitySchedule, createAppointmentSlot, listAppointmentSlots, bookAppointment, getMyAppointment, listMyAppointments, cancelAppointment, checkInAppointment, completeAppointment, markNoShow }
